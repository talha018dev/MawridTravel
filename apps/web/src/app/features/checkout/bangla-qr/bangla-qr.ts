import { DOCUMENT } from '@angular/common';
import { Component, inject, input } from '@angular/core';

const QR_IMAGE_PATH = '/images/checkout/mawrid-payment-qr-code.png';
const WHATSAPP_URL =
  'https://wa.me/8801805226848?text=' +
  encodeURIComponent('Hello Mawrid Travel, I have completed my Bangla QR payment and would like to send my payment receipt for verification.');

@Component({
  selector: 'app-bangla-qr',
  templateUrl: './bangla-qr.html',
  host: { class: 'block' },
})
export class BanglaQr {
  private readonly document = inject(DOCUMENT);

  readonly heading = input('Scan with any bank or mobile banking app to make a payment');
  readonly showPaymentReminder = input(false);
  protected readonly imagePath = QR_IMAGE_PATH;
  protected readonly whatsappUrl = WHATSAPP_URL;

  protected async share(): Promise<void> {
    const navigator = this.document.defaultView?.navigator;
    if (!navigator) return;

    const url = new URL(QR_IMAGE_PATH, this.document.baseURI).href;
    try {
      if (navigator.share) {
        const response = await fetch(url);
        const file = new File([await response.blob()], 'mawrid-travel-payment-qr.png', {
          type: 'image/png',
        });
        await navigator.share(
          navigator.canShare?.({ files: [file] }) ? { files: [file] } : { url },
        );
        return;
      }

      await navigator.clipboard?.writeText(url);
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        await navigator.clipboard?.writeText(url).catch(() => undefined);
      }
    }
  }
}
