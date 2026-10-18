import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  CircleCheck as CheckCircle,
  Download,
  PackageCheck,
  Headset,
  ShoppingBag,
} from 'lucide-react';
import { useLanguage } from '../lib/i18n';
import { useCart } from '../lib/cart';
import { usePageTitle } from '../lib/usePageTitle';

const messages = {
  en: {
    title: 'Thank you for your order!',
    subtitle: 'Your checkout is complete. Here is how to access your purchase.',
    premadeTitle: 'Premade FiveM packages',
    premadeBody: 'Your files are available from the download link on your Tip4Serv order confirmation. Save that page so you can access your files.',
    customTitle: 'Custom orders',
    customBody: 'Custom clothing, chains, GFX and other made-to-order work are delivered through your Discord ticket. Keep your ticket open until your order is completed.',
    supportTitle: 'Need assistance?',
    supportBody: 'If you have trouble accessing a download or have a question about a custom order, contact our support team through Discord.',
    emailNote: 'Look out for a Tip4Serv order-confirmation email and check your spam folder if it does not arrive. Premade downloads are also available on your order confirmation page.',
    shopping: 'Continue Shopping',
  },
  fr: {
    title: 'Merci pour votre commande !',
    subtitle: 'Votre commande est terminée. Voici comment accéder à votre achat.',
    premadeTitle: 'Packs FiveM prêts à télécharger',
    premadeBody: 'Vous pouvez télécharger vos fichiers depuis la page de confirmation de commande Tip4Serv. Conservez ce lien pour retrouver vos fichiers.',
    customTitle: 'Commandes personnalisées',
    customBody: 'Les vêtements, chaînes, créations GFX et autres réalisations personnalisées sont livrés via votre ticket Discord. Gardez ce ticket ouvert jusqu’à la livraison.',
    supportTitle: 'Besoin d’aide ?',
    supportBody: 'Si vous ne parvenez pas à télécharger un fichier ou si vous avez une question sur une commande personnalisée, contactez notre équipe sur Discord.',
    emailNote: 'Vérifiez votre boîte mail pour la confirmation Tip4Serv et votre dossier spam si nécessaire. Les téléchargements sont également disponibles depuis votre page de confirmation.',
    shopping: 'Continuer mes achats',
  },
};

export default function CheckoutSuccessPage() {
  const { lang } = useLanguage();
  const copy = messages[lang];
  const { clearCart } = useCart();
  usePageTitle(copy.title);

  useEffect(() => {
    clearCart();
  }, [clearCart]);

  const sections = [
    { icon: Download, title: copy.premadeTitle, body: copy.premadeBody },
    { icon: PackageCheck, title: copy.customTitle, body: copy.customBody },
    { icon: Headset, title: copy.supportTitle, body: copy.supportBody },
  ];

  return (
    <div className="pt-32 pb-16 animate-fade-in">
      <div className="max-w-2xl mx-auto px-4">
        <div className="text-center mb-10">
          <div className="relative inline-flex items-center justify-center mb-6">
            <div className="relative w-24 h-24 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
              <CheckCircle className="w-12 h-12 text-emerald-400" />
            </div>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-heading mb-3">
            {copy.title}
          </h1>
          <p className="text-lg text-volcanic-300 max-w-md mx-auto">
            {copy.subtitle}
          </p>
        </div>

        <div className="bg-volcanic-900/60 border border-volcanic-800/60 rounded-2xl p-6 sm:p-8 mb-6 space-y-6">
          {sections.map(({ icon: Icon, title, body }) => (
            <div key={title} className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-ark-600/15 border border-ark-600/30 flex items-center justify-center flex-shrink-0">
                <Icon className="w-6 h-6 text-ark-500" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-heading mb-1">{title}</h2>
                <p className="text-volcanic-300 text-sm leading-relaxed">{body}</p>
              </div>
            </div>
          ))}
        </div>

        <p className="text-xs text-volcanic-400 text-center mb-8">
          {copy.emailNote}
        </p>

        <div className="flex flex-col sm:flex-row items-stretch justify-center gap-3">
          <Link
            to="/products"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-ark-600 hover:bg-ark-500 text-white font-semibold rounded-xl transition-colors"
          >
            <ShoppingBag className="w-4 h-4" />
            {copy.shopping}
          </Link>
        </div>
      </div>
    </div>
  );
}
