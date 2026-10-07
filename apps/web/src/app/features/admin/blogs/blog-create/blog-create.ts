import { isPlatformBrowser } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
    Component,
    DestroyRef,
    inject,
    OnInit,
    OnDestroy,
    PLATFORM_ID,
    signal,
    ViewEncapsulation,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
    AbstractControl,
    FormControl,
    FormGroup,
    ReactiveFormsModule,
    Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
    Blog,
    BlogAdminService,
    BlogWriteRequest,
} from '@app/features/admin/blogs/services/blog-admin.service';
import { Button, ButtonDirective } from '@openng/optimus-ui/button';
import { FileUpload } from '@openng/optimus-ui/fileupload';
import { InputText } from '@openng/optimus-ui/inputtext';
import { Message } from '@openng/optimus-ui/message';
import { Textarea } from '@openng/optimus-ui/textarea';
import { ToggleSwitch } from '@openng/optimus-ui/toggleswitch';
import { FileRemoveEvent, FileSelectEvent } from '@openng/optimus-ui/types/fileupload';
import { Editor } from '@tiptap/core';
import Link from '@tiptap/extension-link';
import StarterKit from '@tiptap/starter-kit';
import DOMPurify from 'dompurify';
import { TiptapEditorDirective } from 'ngx-tiptap';
import { catchError, finalize, map, of, switchMap } from 'rxjs';

interface ValidationProblem {
    errors?: Record<string, string[]>;
}

type EditorCommand =
    | 'bold'
    | 'italic'
    | 'strike'
    | 'heading2'
    | 'heading3'
    | 'bulletList'
    | 'orderedList'
    | 'blockquote'
    | 'codeBlock'
    | 'undo'
    | 'redo';

const ALLOWED_TAGS = [
    'p',
    'h2',
    'h3',
    'h4',
    'strong',
    'em',
    's',
    'code',
    'pre',
    'blockquote',
    'ul',
    'ol',
    'li',
    'br',
    'hr',
    'a',
];

function richTextRequired(control: AbstractControl): Record<string, boolean> | null {
    const content = String(control.value ?? '');
    const visibleText = content
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;|&#160;/gi, ' ')
        .trim();
    return visibleText ? null : { required: true };
}

@Component({
    selector: 'app-blog-create',
    imports: [
        Button,
        ButtonDirective,
        FileUpload,
        InputText,
        Message,
        ReactiveFormsModule,
        RouterLink,
        Textarea,
        TiptapEditorDirective,
        ToggleSwitch,
    ],
    templateUrl: './blog-create.html',
    styleUrl: './blog-create.css',
    encapsulation: ViewEncapsulation.None,
})
export class BlogCreate implements OnInit, OnDestroy {
    private readonly blogAdminService = inject(BlogAdminService);
    private readonly destroyRef = inject(DestroyRef);
    private readonly platformId = inject(PLATFORM_ID);
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly blogId = this.route.snapshot.paramMap.get('id');

    protected readonly isEditMode = this.blogId !== null;
    protected readonly loading = signal(this.isEditMode);
    protected readonly loadFailed = signal(false);
    protected readonly submitAttempted = signal(false);
    protected readonly submitting = signal(false);
    protected readonly maxImageBytes = 5 * 1024 * 1024;
    protected readonly selectedImage = signal<File | null>(null);
    protected readonly imagePreviewUrl = signal<string | null>(null);
    protected readonly existingImageUrl = signal<string | null>(null);
    protected readonly removeExistingImage = signal(false);
    protected readonly createdBlog = signal<Blog | null>(null);
    protected readonly editorReady = signal(true);
    protected readonly editorVersion = signal(0);
    protected readonly errorMessage = signal<string | null>(null);
    protected readonly serverErrors = signal<Record<string, string[]>>({});
    protected readonly blogForm = new FormGroup({
        title: new FormControl('', {
            nonNullable: true,
            validators: [Validators.required, Validators.maxLength(200)],
        }),
        slug: new FormControl('', {
            nonNullable: true,
            validators: [Validators.maxLength(220)],
        }),
        excerpt: new FormControl('', {
            nonNullable: true,
            validators: [Validators.maxLength(500)],
        }),
        content: new FormControl('', {
            nonNullable: true,
            validators: [richTextRequired, Validators.maxLength(100_000)],
        }),
        isPublished: new FormControl(false, { nonNullable: true }),
    });
    protected readonly editor = new Editor({
        extensions: [
            StarterKit.configure({ heading: { levels: [2, 3, 4] }, link: false }),
            Link.configure({
                autolink: true,
                linkOnPaste: true,
                openOnClick: false,
                protocols: ['http', 'https', 'mailto'],
            }),
        ],
        content: '',
        editorProps: {
            attributes: {
                'aria-label': 'Blog content',
            },
        },
        onUpdate: ({ editor }) => {
            this.controls.content.setValue(this.sanitizeContent(editor.getHTML()));
            this.editorVersion.update((version) => version + 1);
        },
        onSelectionUpdate: () => this.editorVersion.update((version) => version + 1),
    });

    constructor() {
        for (const [field, control] of Object.entries(this.blogForm.controls)) {
            this.clearServerErrorOnChange(field, control);
        }
    }

    protected get controls() {
        return this.blogForm.controls;
    }

    ngOnInit(): void {
        if (!this.blogId) {
            return;
        }

        this.blogAdminService
            .getBlog(this.blogId)
            .pipe(finalize(() => this.loading.set(false)))
            .subscribe({
                next: (blog) => {
                    this.blogForm.setValue({
                        title: blog.title,
                        slug: blog.slug,
                        excerpt: blog.excerpt ?? '',
                        content: blog.content,
                        isPublished: blog.isPublished,
                    });
                    this.editor.commands.setContent(blog.content);
                    this.existingImageUrl.set(blog.featuredImageUrl);
                },
                error: (error: HttpErrorResponse) => {
                    this.loadFailed.set(true);
                    this.errorMessage.set(
                        error.status === 401 || error.status === 403
                            ? 'Your admin session has expired or you no longer have permission.'
                            : error.status === 404
                              ? 'This blog could not be found.'
                              : 'Unable to load the blog. Please try again.',
                    );
                },
            });
    }

    ngOnDestroy(): void {
        this.revokeImagePreview();
        this.editor.destroy();
    }

    protected run(command: EditorCommand): void {
        const editor = this.editor;
        if (!editor) {
            return;
        }

        const chain = editor.chain().focus();
        switch (command) {
            case 'bold':
                chain.toggleBold().run();
                break;
            case 'italic':
                chain.toggleItalic().run();
                break;
            case 'strike':
                chain.toggleStrike().run();
                break;
            case 'heading2':
                chain.toggleHeading({ level: 2 }).run();
                break;
            case 'heading3':
                chain.toggleHeading({ level: 3 }).run();
                break;
            case 'bulletList':
                chain.toggleBulletList().run();
                break;
            case 'orderedList':
                chain.toggleOrderedList().run();
                break;
            case 'blockquote':
                chain.toggleBlockquote().run();
                break;
            case 'codeBlock':
                chain.toggleCodeBlock().run();
                break;
            case 'undo':
                chain.undo().run();
                break;
            case 'redo':
                chain.redo().run();
                break;
        }
    }

    protected isActive(name: string, attributes?: Record<string, number>): boolean {
        this.editorVersion();
        return this.editor?.isActive(name, attributes) ?? false;
    }

    protected editLink(): void {
        if (!this.editor || !isPlatformBrowser(this.platformId)) {
            return;
        }

        const currentUrl = this.editor.getAttributes('link')['href'] as string | undefined;
        const value = window.prompt('Enter an HTTP, HTTPS or email link:', currentUrl ?? '');
        if (value === null) {
            return;
        }

        const url = value.trim();
        if (!url) {
            this.editor.chain().focus().extendMarkRange('link').unsetLink().run();
            return;
        }

        if (!/^(https?:\/\/|mailto:)/i.test(url)) {
            this.errorMessage.set('Links must start with http://, https:// or mailto:.');
            return;
        }

        this.errorMessage.set(null);
        this.editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    }

    protected onImageSelected(event: FileSelectEvent): void {
        const image = event.currentFiles.at(-1) ?? null;
        this.revokeImagePreview();
        this.selectedImage.set(image);
        this.imagePreviewUrl.set(image ? URL.createObjectURL(image) : null);
        this.removeExistingImage.set(false);
        this.errorMessage.set(null);
    }

    protected onImageRemoved(event: FileRemoveEvent): void {
        if (this.selectedImage() === event.file) {
            this.revokeImagePreview();
            this.selectedImage.set(null);
        }
    }

    protected clearImage(): void {
        this.revokeImagePreview();
        this.selectedImage.set(null);
    }

    protected removeCurrentImage(): void {
        this.clearImage();
        this.removeExistingImage.set(true);
    }

    protected keepCurrentImage(): void {
        this.removeExistingImage.set(false);
    }

    protected selectedImageFiles(): File[] {
        const image = this.selectedImage();
        return image ? [image] : [];
    }

    protected submitBlog(): void {
        this.submitAttempted.set(true);
        this.errorMessage.set(null);
        this.serverErrors.set({});

        const existingBlog = this.createdBlog();
        const sanitizedContent = this.sanitizeContent(this.editor?.getHTML() ?? '');
        this.controls.content.setValue(sanitizedContent);

        if (!existingBlog && this.blogForm.invalid) {
            this.blogForm.markAllAsTouched();
            return;
        }

        if (existingBlog && !this.selectedImage()) {
            void this.router.navigate(['/admin/blog']);
            return;
        }

        this.submitting.set(true);
        const blogRequest$ = existingBlog
            ? of(existingBlog)
            : this.isEditMode
              ? this.blogAdminService.updateBlog(this.blogId!, this.buildRequest())
              : this.blogAdminService.createBlog(this.buildRequest());

        blogRequest$
            .pipe(
                switchMap((blog) => {
                    if (!this.isEditMode) {
                        this.createdBlog.set(blog);
                    }
                    const image = this.selectedImage();
                    if (!image) {
                        if (this.isEditMode && this.removeExistingImage()) {
                            return this.blogAdminService.deleteFeaturedImage(blog.id).pipe(
                                map(() => ({ blog, imageUploaded: true })),
                                catchError(() => of({ blog, imageUploaded: false })),
                            );
                        }
                        return of({ blog, imageUploaded: true });
                    }

                    return this.blogAdminService.uploadFeaturedImage(blog.id, image).pipe(
                        map((updatedBlog) => ({ blog: updatedBlog, imageUploaded: true })),
                        catchError(() => of({ blog, imageUploaded: false })),
                    );
                }),
                finalize(() => this.submitting.set(false)),
            )
            .subscribe({
                next: ({ blog, imageUploaded }) => {
                    if (!imageUploaded) {
                        this.errorMessage.set(
                            this.isEditMode
                                ? 'The blog details were saved, but the featured image change failed. Try saving again.'
                                : 'The blog was created, but the featured image could not be uploaded. The image remains selected so you can retry.',
                        );
                        return;
                    }

                    const destination = this.isEditMode
                        ? ['/admin/blog', blog.id]
                        : ['/admin/blog'];
                    void this.router.navigate(destination, {
                        queryParams: { updated: this.isEditMode ? 'true' : undefined },
                    });
                },
                error: (error: HttpErrorResponse) => this.handleSaveError(error),
            });
    }

    private buildRequest(): BlogWriteRequest {
        const value = this.blogForm.getRawValue();
        return {
            title: value.title.trim(),
            slug: this.optionalValue(value.slug),
            excerpt: this.optionalValue(value.excerpt),
            content: this.sanitizeContent(value.content),
            isPublished: value.isPublished,
        };
    }

    private sanitizeContent(content: string): string {
        return DOMPurify.sanitize(content, {
            ALLOWED_TAGS,
            ALLOWED_ATTR: ['href'],
            ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
        }).trim();
    }

    private handleSaveError(error: HttpErrorResponse): void {
        const problem = error.error as ValidationProblem | null;
        if (error.status === 400 && problem?.errors) {
            this.serverErrors.set(problem.errors);
            for (const field of Object.keys(problem.errors)) {
                const control = this.blogForm.get(field);
                control?.setErrors({ ...control.errors, server: true });
            }
            this.errorMessage.set('Please review the highlighted fields and try again.');
            return;
        }

        this.errorMessage.set(
            error.status === 401 || error.status === 403
                ? 'Your admin session has expired or you no longer have permission.'
                : error.status === 404
                  ? 'This blog no longer exists.'
                  : `Unable to ${this.isEditMode ? 'update' : 'create'} the blog. Please try again.`,
        );
    }

    private optionalValue(value: string): string | null {
        const normalized = value.trim();
        return normalized || null;
    }

    private revokeImagePreview(): void {
        const previewUrl = this.imagePreviewUrl();
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
            this.imagePreviewUrl.set(null);
        }
    }

    private clearServerErrorOnChange(field: string, control: AbstractControl): void {
        control.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
            const errors = this.serverErrors();
            if (!errors[field]) {
                return;
            }

            const remainingErrors = { ...errors };
            delete remainingErrors[field];
            this.serverErrors.set(remainingErrors);

            if (control.hasError('server')) {
                const remainingControlErrors = { ...control.errors };
                delete remainingControlErrors['server'];
                control.setErrors(
                    Object.keys(remainingControlErrors).length ? remainingControlErrors : null,
                );
            }
        });
    }
}
