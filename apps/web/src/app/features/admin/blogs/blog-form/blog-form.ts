import { isPlatformBrowser } from '@angular/common';
import {
    Component,
    effect,
    inject,
    input,
    OnDestroy,
    output,
    PLATFORM_ID,
    signal,
} from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import {
    Blog,
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

export interface BlogFormSubmission {
    blog: BlogWriteRequest;
    featuredImage: File | null;
    removeFeaturedImage: boolean;
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
    'p', 'h2', 'h3', 'h4', 'strong', 'em', 's', 'code', 'pre', 'blockquote',
    'ul', 'ol', 'li', 'br', 'hr', 'a',
];

function richTextRequired(control: AbstractControl): Record<string, boolean> | null {
    const visibleText = String(control.value ?? '')
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;|&#160;/gi, ' ')
        .trim();
    return visibleText ? null : { required: true };
}

@Component({
    selector: 'app-blog-form',
    imports: [
        Button,
        ButtonDirective,
        FileUpload,
        InputText,
        Message,
        ReactiveFormsModule,
        Textarea,
        TiptapEditorDirective,
        ToggleSwitch,
    ],
    templateUrl: './blog-form.html',
})
export class BlogForm implements OnDestroy {
    private readonly platformId = inject(PLATFORM_ID);

    readonly mode = input.required<'create' | 'edit'>();
    readonly blog = input<Blog | null>(null);
    readonly submitting = input(false);
    readonly serverErrors = input<Record<string, string[]>>({});
    readonly errorMessage = input<string | null>(null);

    readonly submitted = output<BlogFormSubmission>();
    readonly cancelled = output<void>();
    readonly changed = output<void>();

    protected readonly submitAttempted = signal(false);
    protected readonly maxImageBytes = 5 * 1024 * 1024;
    protected readonly selectedImage = signal<File | null>(null);
    protected readonly imagePreviewUrl = signal<string | null>(null);
    protected readonly existingImageUrl = signal<string | null>(null);
    protected readonly removeExistingImage = signal(false);
    protected readonly editorReady = signal(true);
    protected readonly editorVersion = signal(0);
    protected readonly editorToolClasses =
        'inline-grid h-9 min-w-9 cursor-pointer place-items-center rounded-lg border border-transparent bg-transparent text-xs text-(--mawrid-font-primary) hover:bg-(--mawrid-nav-hover) hover:text-(--mawrid-nav-hover-text) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--mawrid-accent) aria-pressed:bg-(--mawrid-nav-hover) aria-pressed:text-(--mawrid-nav-hover-text) disabled:cursor-not-allowed disabled:opacity-45';
    protected readonly blogForm = new FormGroup({
        title: new FormControl('', {
            nonNullable: true,
            validators: [Validators.required, Validators.maxLength(200)],
        }),
        slug: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(220)] }),
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
        editorProps: { attributes: { 'aria-label': 'Blog content' } },
        onUpdate: ({ editor }) => {
            this.controls.content.setValue(this.sanitizeContent(editor.getHTML()), {
                emitEvent: false,
            });
            this.editorVersion.update((version) => version + 1);
            this.changed.emit();
        },
        onSelectionUpdate: () => this.editorVersion.update((version) => version + 1),
    });

    private loadedBlogId: string | null = null;

    constructor() {
        effect(() => {
            const blog = this.blog();
            if (!blog || blog.id === this.loadedBlogId) {
                return;
            }

            this.loadedBlogId = blog.id;
            this.blogForm.setValue({
                title: blog.title,
                slug: blog.slug,
                excerpt: blog.excerpt ?? '',
                content: blog.content,
                isPublished: blog.isPublished,
            }, { emitEvent: false });
            this.editor.commands.setContent(blog.content);
            this.existingImageUrl.set(blog.featuredImageUrl);
        });
        this.blogForm.valueChanges.subscribe(() => this.changed.emit());
    }

    protected get controls() {
        return this.blogForm.controls;
    }

    ngOnDestroy(): void {
        this.revokeImagePreview();
        this.editor.destroy();
    }

    protected submitForm(): void {
        this.submitAttempted.set(true);
        this.controls.content.setValue(this.sanitizeContent(this.editor.getHTML()), {
            emitEvent: false,
        });
        if (this.blogForm.invalid) {
            this.blogForm.markAllAsTouched();
            return;
        }

        const value = this.blogForm.getRawValue();
        this.submitted.emit({
            blog: {
                title: value.title.trim(),
                slug: this.optionalValue(value.slug),
                excerpt: this.optionalValue(value.excerpt),
                content: this.sanitizeContent(value.content),
                isPublished: value.isPublished,
            },
            featuredImage: this.selectedImage(),
            removeFeaturedImage: this.removeExistingImage(),
        });
    }

    protected run(command: EditorCommand): void {
        const chain = this.editor.chain().focus();
        switch (command) {
            case 'bold': chain.toggleBold().run(); break;
            case 'italic': chain.toggleItalic().run(); break;
            case 'strike': chain.toggleStrike().run(); break;
            case 'heading2': chain.toggleHeading({ level: 2 }).run(); break;
            case 'heading3': chain.toggleHeading({ level: 3 }).run(); break;
            case 'bulletList': chain.toggleBulletList().run(); break;
            case 'orderedList': chain.toggleOrderedList().run(); break;
            case 'blockquote': chain.toggleBlockquote().run(); break;
            case 'codeBlock': chain.toggleCodeBlock().run(); break;
            case 'undo': chain.undo().run(); break;
            case 'redo': chain.redo().run(); break;
        }
    }

    protected isActive(name: string, attributes?: Record<string, number>): boolean {
        this.editorVersion();
        return this.editor.isActive(name, attributes);
    }

    protected editLink(): void {
        if (!isPlatformBrowser(this.platformId)) return;
        const currentUrl = this.editor.getAttributes('link')['href'] as string | undefined;
        const value = window.prompt('Enter an HTTP, HTTPS or email link:', currentUrl ?? '');
        if (value === null) return;
        const url = value.trim();
        if (!url) {
            this.editor.chain().focus().extendMarkRange('link').unsetLink().run();
        } else if (/^(https?:\/\/|mailto:)/i.test(url)) {
            this.editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
        }
    }

    protected onImageSelected(event: FileSelectEvent): void {
        const image = event.currentFiles.at(-1) ?? null;
        this.revokeImagePreview();
        this.selectedImage.set(image);
        this.imagePreviewUrl.set(image ? URL.createObjectURL(image) : null);
        this.removeExistingImage.set(false);
        this.changed.emit();
    }

    protected onImageRemoved(event: FileRemoveEvent): void {
        if (this.selectedImage() === event.file) this.clearImage();
    }

    protected clearImage(): void {
        this.revokeImagePreview();
        this.selectedImage.set(null);
        this.changed.emit();
    }

    protected removeCurrentImage(): void {
        this.clearImage();
        this.removeExistingImage.set(true);
    }

    protected keepCurrentImage(): void {
        this.removeExistingImage.set(false);
        this.changed.emit();
    }

    protected selectedImageFiles(): File[] {
        const image = this.selectedImage();
        return image ? [image] : [];
    }

    retainFeaturedImage(image: File | null): void {
        this.selectedImage.set(image);
    }

    private sanitizeContent(content: string): string {
        return DOMPurify.sanitize(content, {
            ALLOWED_TAGS,
            ALLOWED_ATTR: ['href'],
            ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
        }).trim();
    }

    private optionalValue(value: string): string | null {
        const normalized = value.trim();
        return normalized || null;
    }

    private revokeImagePreview(): void {
        const previewUrl = this.imagePreviewUrl();
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        this.imagePreviewUrl.set(null);
    }
}
