// Policy pages, from the official site (tamilnaduvolunteers.org/terms-conditions,
// /refund-policy and /privacy-policy). Each section is { heading?, paragraphs?, list? }.
// The contact sections end with TNV's contact details, rendered by the Policy page.

export const POLICIES = {
  'terms-conditions': {
    title: 'Terms and Conditions',
    intro:
      'Welcome to Tamil Nadu Volunteers. By accessing and using our website, you agree to the following terms and conditions. Please read them carefully. If you do not agree with these terms, please do not use our website.',
    sections: [
      {
        heading: '1. Acceptance of terms',
        paragraphs: [
          'By using our website, you acknowledge that you have read, understood, and agree to be bound by these Terms and Conditions and any applicable laws and regulations. We may update these terms from time to time, and it is your responsibility to review them periodically.'
        ]
      },
      {
        heading: '2. Use of website',
        paragraphs: ['You agree to use our website for lawful purposes only. You must not use our site to:'],
        list: [
          'Engage in any unlawful activity or violate any applicable laws or regulations.',
          'Transmit harmful or malicious content, including viruses, malware, or other harmful code.',
          'Impersonate any person or entity or misrepresent your affiliation with any person or entity.'
        ]
      },
      {
        heading: '3. Intellectual property',
        paragraphs: [
          'All content on our website, including text, images, logos, and other materials, is the property of Tamil Nadu Volunteers or its licensors and is protected by intellectual property laws. You may not reproduce, distribute, modify, or create derivative works from any content without our prior written consent.'
        ]
      },
      {
        heading: '4. User contributions',
        paragraphs: [
          'If you submit any content or materials to our website, such as comments or feedback, you grant us a non-exclusive, royalty-free, perpetual, and worldwide license to use, reproduce, modify, and distribute such content. You represent and warrant that you have the rights to grant this license and that your content does not infringe any third-party rights.'
        ]
      },
      {
        heading: '5. Links to third-party websites',
        paragraphs: [
          'Our website may contain links to third-party websites for your convenience. We do not endorse or take responsibility for the content or practices of these sites. Accessing and using third-party websites is at your own risk.'
        ]
      },
      {
        heading: '6. Limitation of liability',
        paragraphs: [
          'To the fullest extent permitted by law, Tamil Nadu Volunteers shall not be liable for any direct, indirect, incidental, consequential, or punitive damages arising from your use of our website or any content therein. We make no warranties or representations about the accuracy, reliability, or completeness of the content on our site.'
        ]
      },
      {
        heading: '7. Indemnification',
        paragraphs: [
          'You agree to indemnify and hold harmless Tamil Nadu Volunteers, its affiliates, officers, directors, employees, and agents from any claims, damages, losses, liabilities, or expenses arising out of your use of our website or violation of these terms.'
        ]
      },
      {
        heading: '8. Governing law',
        // TODO: the official page leaves the jurisdiction blank; confirm before launch
        paragraphs: [
          'These Terms and Conditions are governed by and construed in accordance with the laws of India, without regard to its conflict of law principles. Any disputes arising under or in connection with these terms shall be subject to the exclusive jurisdiction of the courts in Chennai, Tamil Nadu.'
        ]
      },
      {
        heading: '9. Contact information',
        paragraphs: ['If you have any questions or concerns about these Terms and Conditions, please contact us:'],
        contact: true
      }
    ],
    closing: 'Thank you for visiting our website and supporting our mission.'
  },

  'refund-policy': {
    title: 'Refund Policy',
    intro: 'Contributions to Tamil Nadu Volunteers are donations, so they are not refundable.',
    sections: [
      {
        heading: 'Questions',
        paragraphs: ['If you have a question about a payment you made to us, please contact us:'],
        contact: true
      }
    ]
  },

  'privacy-policy': {
    title: 'Privacy Policy',
    intro:
      'Tamil Nadu Volunteers values your privacy and is committed to protecting your personal information. This Privacy Policy outlines how we collect, use, disclose, and safeguard your information when you visit our website or engage with our services. By using our website, you consent to the practices described in this policy.',
    sections: [
      {
        heading: '1. Information we collect',
        paragraphs: ['We may collect the following types of information:'],
        list: [
          'Personal information: your name, email address, phone number, and any other information you provide when you contact us, make a donation, or register for our events or services.',
          'Usage data: information about your interactions with our website, such as IP address, browser type, pages visited, and the time and date of your visit.',
          'Cookies and tracking technologies: we use cookies and similar technologies to enhance your experience on our website and collect data about your browsing behaviour.'
        ]
      },
      {
        heading: '2. How we use your information',
        paragraphs: ['We use your information for the following purposes:'],
        list: [
          'To provide and improve our services: to process donations, manage registrations, and respond to your inquiries or requests.',
          'To communicate with you: to send you updates, newsletters, and information about our programmes, events, and initiatives.',
          'To analyse website usage: to monitor and analyse website performance and user behaviour to improve our site and services.',
          'To ensure security: to protect against unauthorised access, misuse, or fraud.'
        ]
      },
      {
        heading: '3. How we share your information',
        paragraphs: ['We may share your information in the following circumstances:'],
        list: [
          'With service providers: third parties who help us operate our website, process payments, or manage communications.',
          'For legal reasons: if required by law or in response to legal processes or requests from law enforcement agencies.',
          'With your consent: with third parties if you provide explicit consent to do so.'
        ]
      },
      {
        heading: '4. Data security',
        paragraphs: [
          'We implement reasonable administrative, technical, and physical measures to protect your personal information from unauthorised access, disclosure, or misuse. However, no method of transmission over the internet or electronic storage is completely secure, and we cannot guarantee absolute security.'
        ]
      },
      {
        heading: '5. Your rights and choices',
        list: [
          'Access and correction: you have the right to access and correct your personal information held by us. You can request to update or delete your information by contacting us using the details below.',
          'Opt-out: you may opt out of promotional emails or communications from us by following the unsubscribe instructions in them or contacting us directly.'
        ]
      },
      {
        heading: '6. Children’s privacy',
        paragraphs: [
          'Our website is not intended for use by children under the age of 13. We do not knowingly collect personal information from children under 13. If we become aware that we have collected such information, we will take steps to delete it.'
        ]
      },
      {
        heading: '7. Changes to this privacy policy',
        paragraphs: [
          'We may update this Privacy Policy from time to time to reflect changes in our practices or legal requirements. We will post any updates on this page and encourage you to review the policy periodically.'
        ]
      },
      {
        heading: '8. Contact us',
        paragraphs: ['If you have any questions or concerns about this Privacy Policy or our data practices, please contact us:'],
        contact: true
      }
    ],
    closing:
      'Thank you for your trust in Tamil Nadu Volunteers. We are committed to protecting your privacy and ensuring a positive experience on our website.'
  }
};
