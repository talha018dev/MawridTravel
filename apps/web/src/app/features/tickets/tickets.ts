import { Component } from '@angular/core';

const WHATSAPP_BASE_URL = 'https://wa.me/8801805226848';

function whatsappUrl(message: string): string {
  return `${WHATSAPP_BASE_URL}?text=${encodeURIComponent(message)}`;
}

@Component({
  selector: 'app-tickets',
  templateUrl: './tickets.html',
})
export class Tickets {
  protected readonly b2bWhatsAppUrl = whatsappUrl(
    'Hello Mawrid Travel, I would like to discuss B2B flight fares and travel support for my business.',
  );

  protected readonly personalWhatsAppUrl = whatsappUrl(
    'Hello Mawrid Travel, I would like help planning a personal flight and comparing ticket prices.',
  );
}
