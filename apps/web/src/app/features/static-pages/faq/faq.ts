import { Component } from '@angular/core';
import { Accordion, AccordionContent, AccordionHeader, AccordionPanel } from '@openng/optimus-ui/accordion';

@Component({
    selector: 'app-faq',
    imports: [Accordion, AccordionContent, AccordionHeader, AccordionPanel],
    templateUrl: './faq.html',
})
export class Faq {
    protected readonly questions = [
        { question: 'How do I place an order?', answer: 'Add available products to your cart, enter your delivery details at checkout, select a payment method, and submit the order. We will contact you if confirmation is required.' },
        { question: 'Which payment methods are available?', answer: 'You can choose cash on delivery or Bangla QR where available. Bangla QR payments are manually verified after you send your payment receipt through WhatsApp.' },
        { question: 'How much does delivery cost?', answer: 'The current checkout shows the applicable delivery fee for addresses inside or outside Dhaka before you place the order.' },
        { question: 'How can I track my order?', answer: '[Add your customer-facing tracking process here, including how and when status updates are communicated.]' },
        { question: 'Can I cancel or change an order?', answer: '[Add your rules and contact method for changes or cancellations, including any cutoff after processing or delivery begins.]' },
        { question: 'What is your return policy?', answer: '[Add your return and exchange window, eligibility conditions, refund timing, and instructions for damaged or incorrect products.]' },
        { question: 'How do I contact Mawrid Travel?', answer: '[Add your official WhatsApp number, email address, support hours, and expected response time here.]' },
    ];
}
