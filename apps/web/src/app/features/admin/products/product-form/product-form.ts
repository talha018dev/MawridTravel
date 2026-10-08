import { Component, computed, effect, input, output, signal } from '@angular/core';
import {
    AbstractControl,
    FormArray,
    FormControl,
    FormGroup,
    ReactiveFormsModule,
    Validators,
} from '@angular/forms';
import {
    CreateProductRequest,
    Product,
    ProductImage,
} from '@app/features/admin/products/services/product-admin.service';
import { Button, ButtonDirective } from '@openng/optimus-ui/button';
import { FileUpload } from '@openng/optimus-ui/fileupload';
import { InputNumber } from '@openng/optimus-ui/inputnumber';
import { InputText } from '@openng/optimus-ui/inputtext';
import { Message } from '@openng/optimus-ui/message';
import { Textarea } from '@openng/optimus-ui/textarea';
import { ToggleSwitch } from '@openng/optimus-ui/toggleswitch';
import { FileRemoveEvent, FileSelectEvent } from '@openng/optimus-ui/types/fileupload';
import { RemoveButton } from '@app/shared/components/remove-button/remove-button';

export interface ProductFormSubmission {
    product: CreateProductRequest;
    newImages: File[];
    imageIdsToDelete: string[];
}

function wholeNumberValidator(control: AbstractControl): Record<string, boolean> | null {
    const value = control.value as number | null;
    return value === null || Number.isInteger(value) ? null : { wholeNumber: true };
}

type ColorFormGroup = FormGroup<{
    value: FormControl<string>;
    colorHex: FormControl<string>;
}>;

type SizeFormGroup = FormGroup<{
    value: FormControl<string>;
}>;

@Component({
    selector: 'app-product-form',
    imports: [
        Button,
        ButtonDirective,
        FileUpload,
        InputNumber,
        InputText,
        Message,
        ReactiveFormsModule,
        RemoveButton,
        Textarea,
        ToggleSwitch,
    ],
    templateUrl: './product-form.html',
})
export class ProductForm {
    readonly mode = input.required<'create' | 'edit'>();
    readonly product = input<Product | null>(null);
    readonly submitting = input(false);
    readonly serverErrors = input<Record<string, string[]>>({});
    readonly errorMessage = input<string | null>(null);

    readonly submitted = output<ProductFormSubmission>();
    readonly cancelled = output<void>();
    readonly changed = output<void>();

    protected readonly maxImageBytes = 5 * 1024 * 1024;
    protected readonly submitAttempted = signal(false);
    protected readonly existingImages = signal<ProductImage[]>([]);
    protected readonly selectedImages = signal<File[]>([]);
    protected readonly imageIdsToDelete = signal<string[]>([]);
    protected readonly remainingImageSlots = computed(
        () => 10 - (this.existingImages().length - this.imageIdsToDelete().length),
    );
    protected readonly productForm = new FormGroup({
        name: new FormControl('', {
            nonNullable: true,
            validators: [Validators.required, Validators.maxLength(200)],
        }),
        slug: new FormControl('', {
            nonNullable: true,
            validators: [Validators.maxLength(220)],
        }),
        description: new FormControl('', {
            nonNullable: true,
            validators: [Validators.maxLength(10_000)],
        }),
        sku: new FormControl('', {
            nonNullable: true,
            validators: [Validators.maxLength(64)],
        }),
        price: new FormControl<number | null>(null, [Validators.required, Validators.min(0)]),
        compareAtPrice: new FormControl<number | null>(null, [Validators.min(0)]),
        currency: new FormControl('BDT', {
            nonNullable: true,
            validators: [Validators.required, Validators.pattern(/^[A-Za-z]{3}$/)],
        }),
        stockQuantity: new FormControl<number | null>(0, [
            Validators.required,
            Validators.min(0),
            wholeNumberValidator,
        ]),
        isActive: new FormControl(false, { nonNullable: true }),
        colors: new FormArray<ColorFormGroup>([], {
            validators: [Validators.minLength(1)],
        }),
        sizes: new FormArray<SizeFormGroup>([], {
            validators: [Validators.minLength(1)],
        }),
    });

    private loadedProductId: string | null = null;

    constructor() {
        effect(() => {
            const product = this.product();
            if (!product || product.id === this.loadedProductId) {
                return;
            }

            this.productForm.patchValue({
                name: product.name,
                slug: product.slug,
                description: product.description ?? '',
                sku: product.sku ?? '',
                price: product.price,
                compareAtPrice: product.compareAtPrice,
                currency: product.currency,
                stockQuantity: product.stockQuantity,
                isActive: product.isActive,
            });
            this.loadOptions(product);
            this.existingImages.set(product.images);
            this.loadedProductId = product.id;
        });

        this.productForm.valueChanges.subscribe(() => this.changed.emit());
    }

    protected get controls() {
        return this.productForm.controls;
    }

    protected get colors(): FormArray<ColorFormGroup> {
        return this.controls.colors;
    }

    protected get sizes(): FormArray<SizeFormGroup> {
        return this.controls.sizes;
    }

    protected addColor(): void {
        this.colors.push(this.createColorGroup('', '#000000'));
    }

    protected removeColor(index: number): void {
        this.colors.removeAt(index);
    }

    protected addSize(): void {
        this.sizes.push(this.createSizeGroup(''));
    }

    protected removeSize(index: number): void {
        this.sizes.removeAt(index);
    }

    protected submitForm(): void {
        this.submitAttempted.set(true);
        if (this.productForm.invalid) {
            this.productForm.markAllAsTouched();
            return;
        }

        const value = this.productForm.getRawValue();
        this.submitted.emit({
            product: {
                name: value.name.trim(),
                slug: this.optionalValue(value.slug),
                description: this.optionalValue(value.description),
                sku: this.optionalValue(value.sku),
                price: value.price!,
                compareAtPrice: value.compareAtPrice,
                currency: value.currency.trim().toUpperCase(),
                stockQuantity: value.stockQuantity!,
                isActive: value.isActive,
                options: [
                    ...(value.colors.length > 0
                        ? [{
                            name: 'Color',
                            sortOrder: 0,
                            values: value.colors.map((color, index) => ({
                                value: color.value.trim(),
                                colorHex: color.colorHex.toUpperCase(),
                                sortOrder: index,
                            })),
                        }]
                        : []),
                    ...(value.sizes.length > 0
                        ? [{
                            name: 'Size',
                            sortOrder: 1,
                            values: value.sizes.map((size, index) => ({
                                value: size.value.trim(),
                                colorHex: null,
                                sortOrder: index,
                            })),
                        }]
                        : []),
                ],
            },
            newImages: this.selectedImages(),
            imageIdsToDelete: this.imageIdsToDelete(),
        });
    }

    protected onImagesSelected(event: FileSelectEvent): void {
        this.selectedImages.set(event.currentFiles);
        this.changed.emit();
    }

    protected onImageRemoved(event: FileRemoveEvent): void {
        this.selectedImages.update((files) => files.filter((file) => file !== event.file));
        this.changed.emit();
    }

    protected clearImages(): void {
        this.selectedImages.set([]);
        this.changed.emit();
    }

    protected toggleImageRemoval(imageId: string): void {
        this.imageIdsToDelete.update((ids) =>
            ids.includes(imageId) ? ids.filter((id) => id !== imageId) : [...ids, imageId],
        );
        this.changed.emit();
    }

    protected imageWillBeRemoved(imageId: string): boolean {
        return this.imageIdsToDelete().includes(imageId);
    }

    protected selectedImagePreview(file: File): string {
        return (file as File & { objectURL?: string }).objectURL ?? '';
    }

    protected formatFileSize(bytes: number): string {
        return `${(bytes / 1024).toLocaleString(undefined, { maximumFractionDigits: 1 })} KB`;
    }

    retainFailedImageChanges(files: File[], imageIds: string[] = []): void {
        this.selectedImages.set(files);
        this.imageIdsToDelete.set(imageIds);
    }

    refreshExistingImages(images: ProductImage[]): void {
        this.existingImages.set(images);
    }

    private optionalValue(value: string): string | null {
        const normalized = value.trim();
        return normalized || null;
    }

    private createColorGroup(value: string, colorHex: string): ColorFormGroup {
        return new FormGroup({
            value: new FormControl(value, {
                nonNullable: true,
                validators: [Validators.required, Validators.maxLength(100)],
            }),
            colorHex: new FormControl(colorHex, {
                nonNullable: true,
                validators: [Validators.required, Validators.pattern(/^#[0-9A-Fa-f]{6}$/)],
            }),
        });
    }

    private createSizeGroup(value: string): SizeFormGroup {
        return new FormGroup({
            value: new FormControl(value, {
                nonNullable: true,
                validators: [Validators.required, Validators.maxLength(100)],
            }),
        });
    }

    private loadOptions(product: Product): void {
        this.colors.clear({ emitEvent: false });
        this.sizes.clear({ emitEvent: false });

        const options = product.options ?? [];
        const colorOption = options.find(
            (option) => option.name.toLowerCase() === 'color',
        );
        colorOption?.values.forEach((value) =>
            this.colors.push(
                this.createColorGroup(value.value, value.colorHex ?? '#000000'),
                { emitEvent: false },
            ),
        );

        const sizeOption = options.find(
            (option) => option.name.toLowerCase() === 'size',
        );
        sizeOption?.values.forEach((value) =>
            this.sizes.push(this.createSizeGroup(value.value), { emitEvent: false }),
        );
    }
}
