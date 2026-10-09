import { DOCUMENT } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CartService } from '@app/features/cart/cart.service';
import { CheckoutOrder, CheckoutService } from '@app/features/checkout/checkout.service';
import { ButtonDirective } from '@openng/optimus-ui/button';
import { InputText } from '@openng/optimus-ui/inputtext';
import { Message } from '@openng/optimus-ui/message';
import { RadioButton } from '@openng/optimus-ui/radiobutton';
import { Select } from '@openng/optimus-ui/select';
import { Textarea } from '@openng/optimus-ui/textarea';
import { finalize } from 'rxjs';

interface ValidationProblem { errors?: Record<string, string[]>; }
const CHECKOUT_ATTEMPT_KEY = 'mawrid.checkout-attempt.v1';

@Component({
    selector: 'app-checkout',
    imports: [ButtonDirective, InputText, Message, RadioButton, ReactiveFormsModule, RouterLink, Select, Textarea],
    templateUrl: './checkout.html',
})
export class Checkout {
    private readonly checkoutService = inject(CheckoutService);
    private readonly document = inject(DOCUMENT);
    protected readonly cart = inject(CartService);
    protected readonly deliveryAreas = [
        { label: 'Inside Dhaka', value: 'InsideDhaka' },
        { label: 'Outside Dhaka', value: 'OutsideDhaka' },
    ];
    protected readonly submitting = signal(false);
    protected readonly submitAttempted = signal(false);
    protected readonly errorMessage = signal<string | null>(null);
    protected readonly serverErrors = signal<Record<string, string[]>>({});
    protected readonly completedOrder = signal<CheckoutOrder | null>(null);
    protected readonly qrExpanded = signal(false);
    protected readonly checkoutForm = new FormGroup({
        fullName: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(200)] }),
        phone: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(30)] }),
        email: new FormControl('', { nonNullable: true, validators: [Validators.email, Validators.maxLength(320)] }),
        address: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(1_000)] }),
        deliveryArea: new FormControl<'InsideDhaka' | 'OutsideDhaka'>('InsideDhaka', { nonNullable: true, validators: [Validators.required] }),
        paymentMethod: new FormControl<'CashOnDelivery' | 'BanglaQr'>('CashOnDelivery', { nonNullable: true, validators: [Validators.required] }),
    });

    protected submit(): void {
        this.submitAttempted.set(true);
        this.errorMessage.set(null);
        this.serverErrors.set({});
        if (this.checkoutForm.invalid) { this.checkoutForm.markAllAsTouched(); return; }
        if (this.cart.items().length === 0) { this.errorMessage.set('Your cart is empty.'); return; }

        const value = this.checkoutForm.getRawValue();
        this.submitting.set(true);
        const request = {
            fullName: value.fullName.trim(),
            phone: value.phone.trim(),
            email: value.email.trim() || null,
            address: value.address.trim(),
            deliveryArea: value.deliveryArea,
            paymentMethod: value.paymentMethod,
            items: this.cart.items().map((item) => ({
                productId: item.productId,
                colorOptionValueId: item.color.id,
                sizeOptionValueId: item.size.id,
                quantity: item.quantity,
            })),
        };
        const idempotencyKey = this.resolveIdempotencyKey(request);
        this.checkoutService.checkout(request, idempotencyKey).pipe(finalize(() => this.submitting.set(false))).subscribe({
            next: (order) => {
                this.completedOrder.set(order);
                this.cart.clear();
                this.clearIdempotencyKey(idempotencyKey);
            },
            error: (error: HttpErrorResponse) => {
                const problem = error.error as ValidationProblem | null;
                if (error.status === 400 && problem?.errors) {
                    this.serverErrors.set(problem.errors);
                    this.errorMessage.set(Object.values(problem.errors).flat()[0] ?? 'Please review your checkout information and cart.');
                    return;
                }
                this.errorMessage.set('Unable to place your order. Please try again.');
            },
        });
    }

    protected formatPrice(value: number): string {
        return `৳ ${new Intl.NumberFormat('en-BD', { maximumFractionDigits: 2 }).format(value)}`;
    }

    protected deliveryFee(): number {
        return this.checkoutForm.controls.deliveryArea.value === 'OutsideDhaka' ? 130 : 80;
    }

    protected async sharePaymentQr(): Promise<void> {
        const navigator = this.document.defaultView?.navigator;
        if (!navigator) return;

        const url = new URL('/images/checkout/mawrid-payment-qr-code.png', this.document.baseURI).href;
        if (navigator.share) {
            try {
                const response = await fetch(url);
                const qrFile = new File([await response.blob()], 'mawrid-travel-payment-qr.png', {
                    type: 'image/png',
                });

                if (navigator.canShare?.({ files: [qrFile] })) {
                    await navigator.share({ files: [qrFile] });
                } else {
                    await navigator.share({ url });
                }
            } catch (error) {
                if (!(error instanceof DOMException && error.name === 'AbortError')) throw error;
            }
            return;
        }

        await navigator.clipboard?.writeText(url);
    }

    private resolveIdempotencyKey(request: object): string {
        const fingerprint = JSON.stringify(request);

        try {
            const stored = JSON.parse(sessionStorage.getItem(CHECKOUT_ATTEMPT_KEY) ?? 'null') as
                { key?: unknown; fingerprint?: unknown } | null;
            if (stored?.fingerprint === fingerprint && typeof stored.key === 'string') {
                return stored.key;
            }

            const key = crypto.randomUUID();
            sessionStorage.setItem(CHECKOUT_ATTEMPT_KEY, JSON.stringify({ key, fingerprint }));
            return key;
        } catch {
            return crypto.randomUUID();
        }
    }

    private clearIdempotencyKey(key: string): void {
        try {
            const stored = JSON.parse(sessionStorage.getItem(CHECKOUT_ATTEMPT_KEY) ?? 'null') as
                { key?: unknown } | null;
            if (stored?.key === key) sessionStorage.removeItem(CHECKOUT_ATTEMPT_KEY);
        } catch {
            sessionStorage.removeItem(CHECKOUT_ATTEMPT_KEY);
        }
    }
}
