import { db } from './firebase';
import { doc, setDoc } from 'firebase/firestore';

const produits = [
  { id: 1, categorie: "Boissons", nom: "Café", prix: 3.5, emoji: "☕", description: "100% Arabica, torréfié en Tunisie", type: "boisson", actif: true },
  { id: 2, categorie: "Boissons", nom: "Matcha Latte", prix: 6.0, emoji: "🍵", description: "Matcha japonais de grade cérémoniel, lait d'avoine", type: "boisson", actif: true },
  { id: 3, categorie: "Boissons", nom: "Jus d'orange", prix: 5.0, emoji: "🍊", description: "Pressé à froid, oranges locales de saison", type: "boisson", actif: true },
  { id: 4, categorie: "Sans+", nom: "Mousse au chocolat", prix: 7.0, emoji: "🍫", type: "popup", provenance: "Fabriquée dans le laboratoire de La Patisserie d'Inès", composition: "Cacao pur, aquafaba, érythritol — sans sucre ajouté, sans matière grasse", actif: true },
  { id: 5, categorie: "Sans+", nom: "Barre protéinée", prix: 5.5, emoji: "💪", type: "popup", provenance: "Marque Sans+ — fabriquée en interne", composition: "Protéines de whey, flocons d'avoine, beurre de cacahuète — sans sucre ajouté", actif: true },
  { id: 6, categorie: "Pâtisseries", nom: "Éclair chocolat", prix: 4.5, emoji: "🍮", type: "popup", provenance: "Pâtisserie française artisanale — La Patisserie d'Inès", composition: "Pâte à choux, crème pâtissière au chocolat noir, glaçage cacao", actif: true },
  { id: 7, categorie: "Pâtisseries", nom: "Tarte citron", prix: 5.0, emoji: "🍋", type: "popup", provenance: "Pâtisserie française artisanale — La Patisserie d'Inès", composition: "Pâte sablée, crème citron meringuée, citrons frais de Tunisie", actif: true },
  {
    id: 8, categorie: "Salé", nom: "Avocado toast", prix: 9.0, emoji: "🥑", type: "sale",
    composition: "Pain au levain, avocat, œuf poché, graines de sésame, piment d'Espelette",
    ingredients: ["Pain au levain", "Avocat", "Œuf poché", "Graines de sésame", "Piment d'Espelette", "Citron"],
    supplements: [{ nom: "Saumon fumé", prix: 3.0 }, { nom: "Burrata", prix: 4.0 }, { nom: "Avocat supplémentaire", prix: 2.5 }, { nom: "Œuf supplémentaire", prix: 1.5 }],
    actif: true,
  },
  {
    id: 9, categorie: "Salé", nom: "Sandwich thon", prix: 7.5, emoji: "🥪", type: "sale",
    composition: "Pain ciabatta, thon, tomates, olives, harissa maison, salade",
    ingredients: ["Pain ciabatta", "Thon", "Tomates", "Olives", "Harissa", "Salade", "Œuf dur"],
    supplements: [{ nom: "Fromage", prix: 1.5 }, { nom: "Double thon", prix: 2.0 }, { nom: "Frites", prix: 3.0 }],
    actif: true,
  },
];

export async function migrerMenuVersFirestore() {
  for (const produit of produits) {
    const { id, ...data } = produit;
    await setDoc(doc(db, 'menu', String(id)), data);
  }
  console.log('Migration terminée — 9 produits poussés dans Firestore.');
}
