import React from 'react';
import { StyleSheet, Text, View, ScrollView, StatusBar, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronRight } from 'lucide-react-native';
import { useTranslation } from '../context/AppSettingsContext';
import { useDirection } from '../hooks/useDirection';
import { COLORS } from '../constants';

const PRIVACY_AR = {
  title: 'سِيَاسَة الْخُصُوصِيَّة',
  lastUpdated: 'آخر تحديث: ٧ يوليو ٢٠٢٦',
  sections: [
    {
      title: 'حذف الْحِسَاب',
      body: 'يمكنك حذف حسابك في أي وقت. لحذف حسابك وبياناتك الشخصية من تطبيق مَوْعَدَة لِلْهَوَاتِف، يرجى إرسال بريد إلكتروني إلينا على elshawafa26@gmail.com مع ذكر "طلب حذف حساب مَوْعَدَة لِلْهَوَاتِف" في عنوان البريد الإلكتروني، مع ذكر البريد الإلكتروني المسجل به حسابك. سيتم حذف حسابك وجميع بياناتك الشخصية خلال ٣٠ يوماً من تاريخ الطلب.',
    },
    {
      title: '١. الْمُقَدِّمَة وَالنِّطَاق',
      body: 'تطبيق مَوْعَدَة لِلْهَوَاتِف ("نحن" أو "التطبيق") هو منصة للتجارة الإلكترونية متخصصة في بيع الهواتف المحمولة الجديدة والمستعملة والإكسسوارات. تنطبق سياسة الخصوصية هذه على جميع مستخدمي التطبيق داخل جمهورية مصر العربية. باستخدامك للتطبيق، فإنك توافق على جمع واستخدام بياناتك وفقاً لهذه السياسة. إذا كنت لا توافق، يرجى عدم استخدام التطبيق.',
    },
    {
      title: '٢. أَنْوَاع الدَّوْلَة الَّتِي نَجْمَعُهَا',
      sub: [
        {
          heading: 'أ. الدَّوْلَة الَّتِي تُقَدِّمُهَا طَوَاعِيَةً',
          items: ['بيانات الْحِسَاب: الْاسْم الْكَامِل، البريد الإلكتروني، رقم الهاتف، كلمة المرور (مشفرة ولا يمكننا رؤيتها).', 'بيانات التوصيل: عنوان التوصيل بالكامل (المدينة، الشارع، رقم المبنى، الشقة)، رقم هاتف إضافي للتواصل مع مندوب التوصيل.', 'بيانات الطلبات: المنتجات التي تطلبها، الكميات، الأسعار، وسيلة الدفع المختارة، ملاحظات الطلب.', 'تقييمات ومراجعات: التقييمات والتعليقات التي تكتبها على المنتجات.', 'المفضلة وسلة التسوق: المنتجات التي تضيفها إلى المفضلة أو إلى سلة التسوق.', 'صور إثبات الدفع: عند الدفع عبر إنستاباي، قد تقدم صورة لإثبات التحويل (تخزينها مؤقت لمراجعة الطلب وحذفها لاحقاً).', 'تواصل مع الدعم: أي رسائل أو استفسارات ترسلها إلى فريق الدعم.'],
        },
        {
          heading: 'ب. الدَّوْلَة الَّتِي نَجْمَعُهَا تِلْقَائِيًّا',
          items: ['بيانات الجهاز: نوع الجهاز (Android)، نظام التشغيل والإصدار، معرف الجهاز الفريد (Expo Push Token) لإرسال الإشعارات.', 'بيانات الاستخدام: الصفحات التي تزورها داخل التطبيق، الوقت الذي تقضيه، المنتجات التي تبحث عنها.', 'بيانات الموقع التقريبية: موقعك التقريبي (المدينة/المحافظة) بناءً على IP لتحديد تكلفة التوصيل والمخازن القريبة منك. لا نجمع موقعك الدقيق GPS.'],
        },
        {
          heading: 'ج. الدَّوْلَة الَّتِي لَا نَجْمَعُهَا',
          items: ['لا نجمع بيانات الموقع الدقيق GPS.', 'لا نجمع جهات الاتصال الخاصة بك.', 'لا نجمع الصور أو ملفات الوسائط من جهازك إلا التي تختار رفعها طواعية (صورة إثبات الدفع).'],
        },
      ],
    },
    {
      title: '٣. كَيْفِيَّة جَمْع الدَّوْلَة',
      body: 'عند التسجيل: نقوم بجمع بيانات حسابك عند إنشاء حساب جديد. عند تقديم طلب: نقوم بجمع بيانات الطلب وعنوان التوصيل عند إتمام عملية الشراء. عند التفاعل: نجمع بيانات الاستخدام تلقائياً أثناء تصفحك للتطبيق. عند التواصل: نجمع أي بيانات ترسلها عند التواصل مع فريق الدعم.',
    },
    {
      title: '٤. كَيْفِيَّة اسْتِخْدَام دَوْلَتِك',
      body: 'لتقديم الخدمة: معالجة طلباتك وتوصيلها إلى عنوانك وتحديثك بحالة الطلب. للتوصيل: مشاركة عنوانك ورقم هاتفك مع شركة التوصيل لتوصيل طلبك. لاتصال بك: التواصل معك بخصوص طلباتك (تأكيد، تغيير حالة، مشكلة في التوصيل). للدفع: معالجة مدفوعاتك عبر بايموب (البطاقة البنكية والمحفظة الإلكترونية). للتحقق من الدفع: مراجعة صور إثبات الدفع (إنستاباي) لتأكيد الطلب. للإشعارات: إرسال إشعارات الطلبات والعروض الترويجية (يمكنك إلغاء الاشتراك في أي وقت). لتحسين التطبيق: تحليل كيفية استخدامك للتطبيق لتطويره وتحسين تجربتك. للأمان: حماية حسابك ومنع الاحتيال وإساءة الاستخدام. للتوثيق: إرسال رموز التحقق عبر البريد الإلكتروني لتأكيد هويتك عند التسجيل أو تغيير كلمة المرور.',
    },
    {
      title: '٥. الْأَسَاس الْقَانُونِي لِمُعَالَجَة الدَّوْلَة',
      body: 'نقوم بمعالجة بياناتك بناءً على الأسس التالية: تنفيذ العقد: لمعالجة طلباتك وتوصيلها (هذا هو الأساس الرئيسي). الموافقة: لإرسال العروض الترويجية والإشعارات التسويقية (يمكنك سحب موافقتك في أي وقت). المصلحة المشروعة: لتحسين التطبيق ومنع الاحتيال وضمان أمان المنصة. الالتزام القانوني: للامتثال للقوانين واللوائح المعمول بها في مصر.',
    },
    {
      title: '٦. مُشَارَكَة الدَّوْلَة مَعَ أَطْرَاف ثَالِثَة',
      body: 'نشارك بياناتك فقط بالقدر اللازم لتقديم الخدمة، مع: مزودو الخدمة الأساسيون (سوبابيس، بريمو، بايموب، إكسبو، فيرسل). شركات التوصيل: نشارك اسمك وعنوانك ورقم هاتفك مع شركة التوصيل. السلطات القانونية: قد نكشف عن بياناتك إذا تطلب منا القانون ذلك. لن نبيع بياناتك الشخصية لأي طرف ثالث. لن نستخدم بياناتك لأغراض إعلانية خارج التطبيق. لن نشارك بياناتك مع أطراف لأغراض تسويقية دون موافقتك الصريحة.',
    },
    {
      title: '٧. تَخْزِين الدَّوْلَة وَأَمْنُهَا',
      body: 'مكان التخزين: بياناتك مخزنة على خوادم Supabase على مزودي خدمات سحابية (AWS، Google Cloud) في الولايات المتحدة وأوروبا. التشفير: جميع البيانات المنقولة مشفرة باستخدام TLS/SSL. كلمات المرور مشفرة بتقنية bcrypt. الوصول المقيد: الوصول إلى بياناتك محدود للموظفين المصرح لهم فقط. إجراءات أمنية إضافية: نطبق سياسات أمان صارمة ومراجعات دورية. رغم اتخاذنا إجراءات أمنية معقولة، لا يمكن ضمان أمن مطلق للإنترنت.',
    },
    {
      title: '٨. الاحْتِفَاظ بِالدَّوْلَة',
      body: 'بيانات الحساب: نحتفظ بها طالما أن حسابك نشط. إذا حذفت حسابك، نحذف بياناتك الشخصية خلال ٣٠ يوماً. بيانات الطلبات: نحتفظ بسجل طلباتك لمدة ٥ سنوات لأغراض محاسبية وضريبية وقانونية. سلة التسوق والمفضلة: نحتفظ بها طالما أن حسابك نشط. صور إثبات الدفع: نحتفظ بها لمدة ٦ أشهر بعد تأكيد الطلب ثم نحذفها. التقييمات والمراجعات: تبقى مرئية حتى لو حذفت حسابك (بدون اسمك). سجلات الاستخدام: نحتفظ ببيانات الاستخدام مجهولة المصدر لمدة ١٢ شهراً.',
    },
    {
      title: '٩. حُقُوقِك',
      body: 'لك الحقوق التالية: حق الوصول، حق التصحيح، حق الحذف ("حق النسيان")، حق تقييد المعالجة، حق نقل البيانات، حق الاعتراض، حق سحب الموافقة، حق تقديم شكوى. لممارسة هذه الحقوق، يرجى التواصل معنا عبر البريد الإلكتروني. سنستجيب لطلبك خلال ٣٠ يوماً.',
    },
    {
      title: '١٠. حذف الْحِسَاب',
      body: 'يمكنك طلب حذف حسابك في أي وقت عن طريق: إرسال طلب حذف الحساب إلى البريد الإلكتروني elshawafa26@gmail.com. سنقوم بحذف حسابك وجميع بياناتك الشخصية خلال ٣٠ يوماً من تاريخ الطلب. سيتم إلغاء الطلبات المعلقة قبل حذف الحساب. قد نحتفظ ببعض البيانات للامتثال للالتزامات القانونية (مثل سجل الفواتير).',
    },
    {
      title: '١١. الإِشْعَارَات وَالْتِسْوِيق',
      body: 'إشعارات الطلبات: نرسل إشعارات فورية لحالة طلباتك. هذه الإشعارات ضرورية ولا يمكن إلغاؤها لأنها جزء من الخدمة. إشعارات العروض: قد نرسل عروضاً ترويجية إذا وافقت على ذلك. يمكنك إلغاء الاشتراك من إعدادات التطبيق. رسائل البريد الإلكتروني: نرسل الرسائل الأساسية (تأكيد الطلب، الفاتورة، رمز التحقق). نرسل رسائل تسويقية فقط بموافقتك.',
    },
    {
      title: '١٢. ملفَّات تعريف الارْتِبَاط',
      body: 'التطبيق لا يستخدم ملفات تعريف الارتباط بالمعنى التقليدي. نستخدم التخزين المحلي (AsyncStorage) لحفظ حالة تسجيل الدخول وسلة التسوق على جهازك. التخزين المؤقت (Cache) لتسريع التحميل. رموز الجلسة (JWT tokens) للحفاظ على حالة تسجيل الدخول. لا نستخدم تقنيات التتبع عبر المواقع المختلفة.',
    },
    {
      title: '١٣. الرَّوَابِط الْخَارِجِيَّة',
      body: 'التطبيق قد يحتوي على روابط لمواقع خارجية (مثل إنستاباي للدفع). نحن غير مسؤولين عن ممارسات الخصوصية لهذه المواقع. ننصحك بقراءة سياسات الخصوصية الخاصة بهم.',
    },
    {
      title: '١٤. مُعَالَجَة الْمُدْفُوعَات',
      body: 'البطاقة البنكية والمحفظة الإلكترونية: تتم المعالجة بالكامل عبر بايموب. لا نرى ولا نخزن معلومات بطاقتك البنكية. الدفع عند الاستلام: لا تتم معالجة أي بيانات دفع إلكتروني. إنستاباي: تقدم صورة إثبات التحويل طواعية. تستخدم فقط للتحقق من الدفع وتحذف بعد ٦ أشهر.',
    },
    {
      title: '١٥. نَقْل الدَّوْلَة الدُّوْلِيّ',
      body: 'بياناتك قد تُنقل وتُخزن على خوادم خارج مصر (الولايات المتحدة وأوروبا) عبر مزودي الخدمة. نضمن التزام هؤلاء المزودين بمعايير حماية البيانات.',
    },
    {
      title: '١٦. خَصُوصِيَّة الْأَطْفَال',
      body: 'تطبيقنا غير موجه للأطفال دون سن ١٣ عاماً. نحن لا نجمع عن قصد بيانات شخصية من الأطفال دون ١٣ عاماً. إذا اكتشفنا جمع بيانات طفل دون ١٣ عاماً دون موافقة ولي الأمر، سنقوم بحذفها فوراً.',
    },
    {
      title: '١٧. التَّغْيِيرَات عَلَى هَذِهِ السِّيَاسَة',
      body: 'قد نقوم بتحديث هذه السياسة من وقت لآخر. سنخطرك بالتغييرات المهمة عن طريق إشعار داخل التطبيق و/أو بريد إلكتروني للتغييرات الجوهرية. ننصحك بمراجعة هذه الصفحة دورياً. استمرار استخدامك للتطبيق بعد التغييرات يعتبر موافقة منك.',
    },
    {
      title: '١٨. إِجْرَاءَات اخْتِرَاق الدَّوْلَة',
      body: 'في حالة اختراق البيانات: سنقوم بإخطارك خلال ٧٢ ساعة. سنخبرك بنوع البيانات المتأثرة والإجراءات التي اتخذناها. سنعمل مع السلطات المختصة. سنتخذ إجراءات فورية لمنع تكرار الاختراق.',
    },
    {
      title: '١٩. الْقَانُون الْحَاكِم',
      body: 'تخضع سياسة الخصوصية هذه للقوانين واللوائح المعمول بها في جمهورية مصر العربية. أي نزاع يخضع للاختصاص القضائي للمحاكم المصرية.',
    },
    {
      title: '٢٠. التَّوَاصُل مَعَنَا',
      body: 'إذا كان لديك أي استفسار أو طلب بخصوص سياسة الخصوصية هذه أو بياناتك الشخصية، يرجى التواصل عبر البريد الإلكتروني elshawafa26@gmail.com. سنرد على جميع الاستفسارات خلال ٥ أيام عمل. لممارسة حقوقك (حذف الحساب، تصحيح البيانات)، سنستجيب خلال ٣٠ يوماً.',
    },
  ],
};

const PRIVACY_EN = {
  title: 'Privacy Policy',
  lastUpdated: 'Last updated: July 7, 2026',
  sections: [
    {
      title: 'Delete Account',
      body: 'You can delete your account at any time. To delete your account and personal data from Mawada Phone App, send an email to elshawafa26@gmail.com with the subject "Mawada Phone Account Deletion Request" and include the email address registered to your account. Your account and all personal data will be deleted within 30 days of the request.',
    },
    {
      title: '1. Introduction & Scope',
      body: 'Mawada Phone App ("we" or "the app") is an e-commerce platform specializing in selling new and used mobile phones and accessories. This Privacy Policy applies to all users of the app within the Arab Republic of Egypt. By using the app, you consent to the collection and use of your data as described in this policy. If you do not agree, please do not use the app.',
    },
    {
      title: '2. Types of Data We Collect',
      sub: [
        {
          heading: 'A. Data You Voluntarily Provide',
          items: ['Account Data: Full name, email address, phone number, password (encrypted and not visible to us).', 'Delivery Data: Full delivery address (city, street, building number, apartment), additional phone number for the delivery driver.', 'Order Data: Products ordered, quantities, prices, selected payment method, order notes.', 'Reviews & Ratings: Ratings and comments you write about products.', 'Wishlist & Cart: Products added to your wishlist or shopping cart.', 'Payment Proof Images: When paying via InstaPay, you may voluntarily provide a transfer screenshot (stored temporarily for order review, deleted later).', 'Support Communications: Any messages or inquiries you send to our support team.'],
        },
        {
          heading: 'B. Data Collected Automatically',
          items: ['Device Data: Device type (Android), operating system and version, unique device identifier (Expo Push Token) for push notifications.', 'Usage Data: Pages visited within the app, time spent, products searched.', 'Approximate Location Data: Your approximate location (city/governorate) based on IP address to determine delivery cost and nearby branches. We do not collect your precise GPS location.'],
        },
        {
          heading: 'C. Data We Do Not Collect',
          items: ['We do not collect precise GPS location.', 'We do not collect your contacts.', 'We do not collect photos or media from your device except those you voluntarily upload (payment proof image).'],
        },
      ],
    },
    {
      title: '3. How We Collect Data',
      body: 'During Registration: We collect your account data when you create a new account. When Placing an Order: We collect order data and delivery address when completing a purchase. During Interaction: We collect usage data automatically while you browse the app. When Contacting Us: We collect any data you send when contacting support.',
    },
    {
      title: '4. How We Use Your Data',
      body: 'To Provide Service: Process your orders, deliver them to your address, and update you on order status. For Delivery: Share your address and phone number with the delivery company. To Contact You: Communicate with you regarding your orders. For Payment: Process your payments via Paymob (card and wallet). For Payment Verification: Review payment proof images (InstaPay). For Notifications: Send order notifications and promotional offers (you can opt out anytime). To Improve the App: Analyze your usage patterns. For Security: Protect your account and prevent fraud. For Authentication: Send verification codes via email.',
    },
    {
      title: '5. Legal Basis for Processing',
      body: 'We process your data based on: Contract Performance (to process and deliver your orders), Consent (to send promotional offers, which you can withdraw), Legitimate Interest (to improve the app and ensure security), and Legal Compliance (to comply with applicable laws in Egypt).',
    },
    {
      title: '6. Data Sharing with Third Parties',
      body: 'We only share your data as necessary to provide the service. Core Service Providers: Supabase (database), Brevo (email), Paymob (payments), Expo (push notifications), Vercel (admin hosting). Delivery Companies: We share your name, address, and phone. Legal Authorities: We may disclose data if required by law. We will never sell your personal data, use it for external advertising, or share it for marketing without your explicit consent.',
    },
    {
      title: '7. Data Storage & Security',
      body: 'Your data is stored on Supabase servers using cloud providers (AWS, Google Cloud) in the United States and Europe. All data is encrypted using TLS/SSL. Passwords are hashed using bcrypt. Access is limited to authorized personnel. We implement strict security policies and periodic system reviews. No internet transmission is 100% secure.',
    },
    {
      title: '8. Data Retention',
      body: 'Account Data: Retained while your account is active. Deleted within 30 days of account deletion. Order Data: Retained for 5 years for accounting, tax, and legal purposes. Cart & Wishlist: Retained while your account is active. Payment Proof Images: Retained for 6 months after order confirmation, then automatically deleted. Reviews: Remain visible (without your name) after account deletion. Usage Logs: Anonymized, retained for 12 months.',
    },
    {
      title: '9. Your Rights',
      body: 'You have the following rights: Right to Access, Right to Rectification, Right to Erasure, Right to Restrict Processing, Right to Data Portability, Right to Object, Right to Withdraw Consent, Right to Lodge a Complaint. Contact us via email to exercise these rights. We will respond within 30 days.',
    },
    {
      title: '10. Account Deletion',
      body: 'Send a deletion request to elshawafa26@gmail.com. We will delete your account and all personal data within 30 days. Pending orders will be cancelled. We may retain some data to comply with legal obligations (e.g., invoice records).',
    },
    {
      title: '11. Notifications & Marketing',
      body: 'Order Notifications: Push notifications about order status (essential, cannot be disabled). Promotional Notifications: Sent only if you opt in. You can opt out from app settings. Email Communications: Essential emails (order confirmation, invoice, verification code). Marketing emails only with consent.',
    },
    {
      title: '12. Cookies & Similar Technologies',
      body: 'The app does not use traditional cookies. We use Local Storage (AsyncStorage) for login state and cart, Cache for performance, and Session Tokens (JWT) for login state. We do not use cross-site tracking.',
    },
    {
      title: '13. External Links',
      body: 'The app may contain links to external websites (e.g., InstaPay). We are not responsible for their privacy practices. We recommend reading their privacy policies.',
    },
    {
      title: '14. Payment Processing',
      body: 'Card & Wallet Payments: Processed entirely by Paymob. We never see or store your card details. Cash on Delivery: No electronic payment data processed. InstaPay: You voluntarily provide a transfer screenshot used only for verification, deleted after 6 months.',
    },
    {
      title: '15. International Data Transfer',
      body: 'Your data may be transferred to servers outside Egypt through our service providers (Supabase, Brevo, etc.). We ensure these providers comply with applicable data protection standards.',
    },
    {
      title: "16. Children's Privacy",
      body: 'Our app is not intended for children under 13. We do not knowingly collect personal data from children under 13. If we discover data collected without parental consent, we will delete it immediately.',
    },
    {
      title: '17. Changes to This Policy',
      body: 'We may update this policy from time to time. Material changes will be communicated via in-app notification and/or email. Continued use after changes constitutes acceptance.',
    },
    {
      title: '18. Data Breach Procedures',
      body: 'In the event of a data breach: We will notify you within 72 hours, inform you of affected data, work with authorities, and take immediate action to prevent recurrence.',
    },
    {
      title: '19. Governing Law',
      body: 'This Privacy Policy is governed by the laws of the Arab Republic of Egypt. Disputes are subject to the jurisdiction of Egyptian courts.',
    },
    {
      title: '20. Contact Us',
      body: 'For questions or requests regarding this policy, contact us at elshawafa26@gmail.com. We respond within 5 business days. For data rights (deletion, correction), we respond within 30 days.',
    },
  ],
};

const TERMS_AR = {
  title: 'الشُّرُوط وَالْأَحْكَام',
  lastUpdated: 'آخر تحديث: ٧ يوليو ٢٠٢٦',
  sections: [
    {
      title: '١. قَبُول الشُّرُوط',
      body: 'باستخدامك لتطبيق مَوْعَدَة لِلْهَوَاتِف ("التطبيق")، فإنك توافق على الالتزام بهذه الشروط والأحكام ("الشروط"). إذا كنت لا توافق على أي شرط من هذه الشروط، يرجى عدم استخدام التطبيق. نحتفظ بالحق في تعديل هذه الشروط في أي وقت. استمرار استخدامك بعد التعديلات يعتبر موافقتك على الشروط المحدثة.',
    },
    {
      title: '٢. الْتَسْجِيل وَالْحِسَاب',
      body: 'يجب أن يكون عمرك ١٨ عاماً على الأقل لإنشاء حساب. يجب تقديم معلومات دقيقة وكاملة عند التسجيل. أنت مسؤول عن الحفاظ على سرية كلمة المرور. أنت مسؤول عن جميع الأنشطة التي تتم تحت حسابك. نحتفظ بالحق في تعليق أو حذف الحسابات التي تنتهك هذه الشروط أو التي نكتشف أنها احتيالية.',
    },
    {
      title: '٣. الْمُنتَجَات وَالْأَسْعَار',
      body: 'نبذل قصارى جهدنا لعرض صور وأوصاف دقيقة للمنتجات. قد تختلف الألوان الفعلية قليلاً بسبب فروقات الشاشات. الأسعار معروضة بالجنيه المصري شاملة ضريبة القيمة المضافة. نحتفظ بالحق في تغيير الأسعار في أي وقت بدون إشعار مسبق. في حالة الخطأ في السعر، نحتفظ بالحق في إلغاء الطلب وإعادة المبلغ المدفوع بالكامل.',
    },
    {
      title: '٤. الْطَّلْبَات وَالدَّفْع',
      body: 'يُعتبر الطلب مقبولاً فقط بعد تأكيد الطلب عبر البريد الإلكتروني أو الإشعار داخل التطبيق. نحتفظ بالحق في رفض أو إلغاء أي طلب لأي سبب. طرق الدفع المقبولة: البطاقة البنكية، المحفظة الإلكترونية، الدفع عند الاستلام (COD)، إنستاباي. جميع المعالجات الإلكترونية تتم عبر بايموب بشكل آمن. لا نخزن معلومات بطاقتك البنكية على خوادمنا.',
    },
    {
      title: '٥. الشَّحْن وَالتَّوْصِيل',
      body: 'نقدم خدمة التوصيل داخل جمهورية مصر العربية. تختلف أوقات التوصيل حسب الموقع ونوع المنتج. رسوم التوصيل معروضة أثناء إتمام الطلب وقد تختلف حسب العنوان. نحن غير مسؤولين عن التأخير الناتج عن ظروف خارجة عن سيطرتنا (الطقس، الازدحام، القوى القاهرة). يُتِّق المندوب للتوصيل، ويرجى التأكد من إمكانية الوصول إلى العنوان.',
    },
    {
      title: '٦. إِرْجَاع وَاسْتِرْدَاد الْمُبلغ',
      body: 'يمكنك إرجاع المنتج خلال ١٤ يوماً من تاريخ الاستلام إذا كان المنتج khôngamaged أو به عيب في الصناعة. يجب أن يكون المنتج في حالته الأصلية مع جميع الملحقات والتغليف. المنتجات المستعملة لها ضمان ٣٠ يوماً من تاريخ الشراء. لا يمكن إرجاع المنتجات التالفة بسبب سوء الاستخدام. يتم رد المبلغ خلال ٧-١٤ يوم عمل من استلام المنتج المرتجع.',
    },
    {
      title: '٧. الضَّمَان',
      body: 'المنتجات الجديدة لها ضمان المصنع حسب الشروط المذكورة في صفحة المنتج. المنتجات المستعملة لها ضمان ٣٠ يوماً من تاريخ الشراء يشمل عيوب الصناعة فقط. لا يشمل الضمان الأضرار الناتجة عن سوء الاستخدام أو السقوط أو الماء. للاستفادة من الضمان، يجب تقديم فاتورة الشراء أو إثبات الطلب من التطبيق.',
    },
    {
      title: '٨. دَفْع عِنْد اسْتِلَام (COD)',
      body: 'يمكنك الدفع نقداً عند استلام الطلب من مندوب التوصيل. يرجى تجهيز المبلغ المطلوب بالضبط. إذا لم تتمكن من الدفع عند الاستلام، قد يتم إلغاء الطلب. رسوم الدفع عند الاستلام قد تختلف عن الدفع الإلكتروني.',
    },
    {
      title: '٩. إنستاباي',
      body: 'يمكنك الدفع عبر إنستاباي عن طريق تحويل المبلغ إلى الحساب المذكور في التطبيق. يجب إرفاق صورة إثبات التحويل عبر التطبيق. سيتم مراجعة الإثبات خلال ٢٤ ساعة عمل. لا يتم شحن الطلب حتى يتم التحقق من الدفع. إثبات الدفع المقدم يُحفظ لمدة ٦ أشهر ثم يُحذف تلقائياً.',
    },
    {
      title: '١٠. سُلُوك الْمُسْتَخْدِم',
      body: 'يجب عدم استخدام التطبيق لأي غرض غير قانوني أو ضار. يُحظر نشر محتوى مسيء أو احتيالي أو مخالف. يُحظر محاولة الوصول غير المصرح به إلى أنظمة التطبيق. يُحظر استخدام أي أدوات آلية لجمع البيانات من التطبيق. نحتفظ بالحق في تعليق الحسابات التي تنتهك هذه القواعد.',
    },
    {
      title: '١١. الْمِلْكِيَّة الْفِكْرِيَّة',
      body: 'جميع محتويات التطبيق (النصوص، الصور، التصميم، الشعارات، الأكواد البرمجية) هي ملكية لمَوْعَدَة لِلْهَوَاتِف أو المرخصين لها. يُحظر نسخ أو تعديل أو توزيع أي محتوى من التطبيق دون إذن كتابي مسبق.',
    },
    {
      title: '١٢. تَحْدِيد الْمَسْؤُولِيَّة',
      body: 'التطبيق يُقدم "كما هو" و"كما هو متاح". لا نضمن أن التطبيق خالٍ من الأخطاء أو المتوقف عن العمل بشكل مؤقت. لا نتحمل المسؤولية عن الأضرار غير المباشرة أو التبعية الناتجة عن استخدام التطبيق. مسؤوليتنا لا تتجاوز المبلغ المدفوع منك للمنتج المعني.',
    },
    {
      title: '١٣. حَلّ النِّزَاعَات',
      body: 'في حالة أي نزاع، نشجعك على التواصل معنا أولاً لحل المشكلة ودياً عبر البريد الإلكتروني elshawafa26@gmail.com. إذا لم يتم الحل ودياً، النزاع يخضع للاختصاص القضائي للمحاكم المصرية.',
    },
    {
      title: '١٤. التَّغْيِيرَات عَلَى الشُّرُوط',
      body: 'نحتفظ بالحق في تعديل هذه الشروط في أي وقت. سنخطرك بالتغييرات الجوهرية عبر التطبيق أو البريد الإلكتروني. استمرار استخدامك بعد التعديلات يعتبر موافقتك على الشروط المحدثة.',
    },
    {
      title: '١٥. الْقَانُون الْحَاكِم',
      body: 'تخضع هذه الشروط للقوانين واللوائح المعمول بها في جمهورية مصر العربية. أي نزاع يخضع للاختصاص القضائي للمحاكم المصرية.',
    },
    {
      title: '١٦. التَّوَاصُل مَعَنَا',
      body: 'لأي استفسار بخصوص هذه الشروط، يرجى التواصل عبر البريد الإلكتروني elshawafa26@gmail.com.',
    },
  ],
};

const TERMS_EN = {
  title: 'Terms & Conditions',
  lastUpdated: 'Last updated: July 7, 2026',
  sections: [
    {
      title: '1. Acceptance of Terms',
      body: 'By using the Mawada Phone App ("the App"), you agree to be bound by these Terms and Conditions ("Terms"). If you do not agree to any of these Terms, please do not use the App. We reserve the right to modify these Terms at any time. Continued use after modifications constitutes acceptance of the updated Terms.',
    },
    {
      title: '2. Registration & Account',
      body: 'You must be at least 18 years old to create an account. You must provide accurate and complete information during registration. You are responsible for maintaining the confidentiality of your password. You are responsible for all activities under your account. We reserve the right to suspend or delete accounts that violate these Terms or are found to be fraudulent.',
    },
    {
      title: '3. Products & Pricing',
      body: 'We make every effort to display accurate product images and descriptions. Actual colors may vary slightly due to screen differences. Prices are displayed in Egyptian Pounds and include VAT. We reserve the right to change prices at any time without notice. In case of pricing errors, we reserve the right to cancel the order and issue a full refund.',
    },
    {
      title: '4. Orders & Payment',
      body: 'An order is only accepted after confirmation via email or in-app notification. We reserve the right to refuse or cancel any order for any reason. Accepted payment methods: Credit/debit card, Digital wallet, Cash on Delivery (COD), InstaPay. All electronic transactions are processed securely through Paymob. We do not store your card details on our servers.',
    },
    {
      title: '5. Shipping & Delivery',
      body: 'We offer delivery services within the Arab Republic of Egypt. Delivery times vary depending on location and product type. Delivery fees are displayed at checkout and may vary by address. We are not responsible for delays caused by circumstances beyond our control (weather, traffic, force majeure). The delivery driver will contact you before delivery. Please ensure your address is accessible.',
    },
    {
      title: '6. Returns & Refunds',
      body: 'You may return a product within 14 days of receipt if it is undamaged and has manufacturing defects. The product must be in its original condition with all accessories and packaging. Used products have a 30-day warranty from the date of purchase. Products damaged due to misuse cannot be returned. Refunds are processed within 7-14 business days of receiving the returned product.',
    },
    {
      title: '7. Warranty',
      body: 'New products come with the manufacturer warranty as described on the product page. Used products have a 30-day warranty from the date of purchase covering manufacturing defects only. The warranty does not cover damage from misuse, drops, or water. To claim warranty, you must present the purchase receipt or order proof from the App.',
    },
    {
      title: '8. Cash on Delivery (COD)',
      body: 'You may pay cash upon delivery of your order from the delivery driver. Please have the exact amount ready. If you are unable to pay at delivery, the order may be cancelled. COD fees may differ from electronic payment fees.',
    },
    {
      title: '9. InstaPay',
      body: 'You can pay via InstaPay by transferring the amount to the account shown in the App. You must attach a transfer proof image through the App. The proof will be reviewed within 24 business hours. The order will not be shipped until payment is verified. The payment proof image is retained for 6 months and then automatically deleted.',
    },
    {
      title: '10. User Conduct',
      body: 'You must not use the App for any illegal or harmful purpose. Posting abusive, fraudulent, or offensive content is prohibited. Attempting unauthorized access to App systems is prohibited. Using automated tools to scrape data from the App is prohibited. We reserve the right to suspend accounts that violate these rules.',
    },
    {
      title: '11. Intellectual Property',
      body: 'All App content (text, images, design, logos, code) is the property of Mawada Phone or its licensors. You may not copy, modify, or distribute any content from the App without prior written permission.',
    },
    {
      title: '12. Limitation of Liability',
      body: 'The App is provided "as is" and "as available". We do not guarantee the App is error-free or uninterrupted. We are not liable for indirect or consequential damages arising from App use. Our liability does not exceed the amount you paid for the specific product in question.',
    },
    {
      title: '13. Dispute Resolution',
      body: 'In case of any dispute, we encourage you to contact us first to resolve the matter amicably at elshawafa26@gmail.com. If not resolved amicably, disputes are subject to the jurisdiction of Egyptian courts.',
    },
    {
      title: '14. Changes to Terms',
      body: 'We reserve the right to modify these Terms at any time. Material changes will be notified via the App or email. Continued use after modifications constitutes acceptance of the updated Terms.',
    },
    {
      title: '15. Governing Law',
      body: 'These Terms are governed by the laws and regulations of the Arab Republic of Egypt. Any dispute is subject to the jurisdiction of Egyptian courts.',
    },
    {
      title: '16. Contact Us',
      body: 'For any questions regarding these Terms, please contact us at elshawafa26@gmail.com.',
    },
  ],
};

function renderSection(section, index, dir) {
  return (
    <View key={index} style={styles.section}>
      <Text style={[styles.sectionTitle, { textAlign: dir.textAlign }]}>{section.title}</Text>
      {section.body && (
        <Text style={[styles.body, { textAlign: dir.textAlign }]}>{section.body}</Text>
      )}
      {section.sub && section.sub.map((group, gi) => (
        <View key={gi} style={styles.subGroup}>
          <Text style={[styles.subHeading, { textAlign: dir.textAlign }]}>{group.heading}</Text>
          {group.items.map((item, ii) => (
            <Text key={ii} style={[styles.listItem, { textAlign: dir.textAlign }]}>• {item}</Text>
          ))}
        </View>
      ))}
    </View>
  );
}

export default function LegalScreen({ navigation, route }) {
  const { type } = route.params || { type: 'privacy' };
  const { t, locale } = useTranslation();
  const dir = useDirection();
  const insets = useSafeAreaInsets();

  const isPrivacy = type === 'privacy';
  const content = locale === 'ar'
    ? (isPrivacy ? PRIVACY_AR : TERMS_AR)
    : (isPrivacy ? PRIVACY_EN : TERMS_EN);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={[styles.headerRow, { flexDirection: dir.row }]}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <ChevronRight color={COLORS.text} size={24} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{content.title}</Text>
          <View style={{ width: 40 }} />
        </View>
      </View>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        <Text style={[styles.lastUpdated, { textAlign: dir.textAlign }]}>{content.lastUpdated}</Text>
        {content.sections.map((section, i) => renderSection(section, i, dir))}
        {locale === 'ar' && isPrivacy && (
          <Text style={[styles.email, { textAlign: dir.textAlign }]}>البريد الإلكتروني: elshawafa26@gmail.com</Text>
        )}
        {locale === 'en' && isPrivacy && (
          <Text style={[styles.email, { textAlign: dir.textAlign }]}>Email: elshawafa26@gmail.com</Text>
        )}
        {!isPrivacy && (
          <Text style={[styles.email, { textAlign: dir.textAlign }]}>elshawafa26@gmail.com</Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { backgroundColor: COLORS.white, paddingBottom: 12, shadowColor: COLORS.black, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3 },
  headerRow: { alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, height: 44 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#0F172A', textAlign: 'center' },
  scroll: { padding: 20, paddingBottom: 100 },
  lastUpdated: { fontSize: 13, color: '#94A3B8', marginBottom: 20 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#0F172A', marginBottom: 8 },
  body: { fontSize: 14.5, color: '#334155', lineHeight: 24 },
  subGroup: { marginTop: 8 },
  subHeading: { fontSize: 15, fontWeight: '600', color: '#1E293B', marginBottom: 4, marginTop: 4 },
  listItem: { fontSize: 14, color: '#475569', lineHeight: 22, marginLeft: 4, marginBottom: 2 },
  email: { fontSize: 14, color: '#3B82F6', marginTop: 8, textAlign: 'center' },
});
