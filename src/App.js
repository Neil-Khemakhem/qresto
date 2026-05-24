import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, addDoc, onSnapshot, query, where, serverTimestamp, doc, getDoc, updateDoc } from 'firebase/firestore';

const BRUN = '#7B2B0A';
const CREME = '#FAF7F2';
const CREME2 = '#F0E8DC';
const BLEU = '#7A9AAD';
const BLEU_LIGHT = '#8FA8B8';
const BORDER = '#E8DDD0';
const BRUN_LIGHT = '#D4C4B0';
const VERT = '#166534';

const menu = [
  { id: 1, categorie: "Boissons", nom: "Café", prix: 3.5, emoji: "☕", description: "100% Arabica, torréfié en Tunisie", type: "boisson" },
  { id: 2, categorie: "Boissons", nom: "Matcha Latte", prix: 6.0, emoji: "🍵", description: "Matcha japonais de grade cérémoniel, lait d'avoine", type: "boisson" },
  { id: 3, categorie: "Boissons", nom: "Jus d'orange", prix: 5.0, emoji: "🍊", description: "Pressé à froid, oranges locales de saison", type: "boisson" },
  { id: 4, categorie: "Sans+", nom: "Mousse au chocolat", prix: 7.0, emoji: "🍫", type: "popup", provenance: "Fabriquée dans le laboratoire de La Patisserie d'Inès", composition: "Cacao pur, aquafaba, érythritol — sans sucre ajouté, sans matière grasse" },
  { id: 5, categorie: "Sans+", nom: "Barre protéinée", prix: 5.5, emoji: "💪", type: "popup", provenance: "Marque Sans+ — fabriquée en interne", composition: "Protéines de whey, flocons d'avoine, beurre de cacahuète — sans sucre ajouté" },
  { id: 6, categorie: "Pâtisseries", nom: "Éclair chocolat", prix: 4.5, emoji: "🍮", type: "popup", provenance: "Pâtisserie française artisanale — La Patisserie d'Inès", composition: "Pâte à choux, crème pâtissière au chocolat noir, glaçage cacao" },
  { id: 7, categorie: "Pâtisseries", nom: "Tarte citron", prix: 5.0, emoji: "🍋", type: "popup", provenance: "Pâtisserie française artisanale — La Patisserie d'Inès", composition: "Pâte sablée, crème citron meringuée, citrons frais de Tunisie" },
  {
    id: 8, categorie: "Salé", nom: "Avocado toast", prix: 9.0, emoji: "🥑", type: "sale",
    composition: "Pain au levain, avocat, œuf poché, graines de sésame, piment d'Espelette",
    ingredients: ["Pain au levain", "Avocat", "Œuf poché", "Graines de sésame", "Piment d'Espelette", "Citron"],
    supplements: [{ nom: "Saumon fumé", prix: 3.0 }, { nom: "Burrata", prix: 4.0 }, { nom: "Avocat supplémentaire", prix: 2.5 }, { nom: "Œuf supplémentaire", prix: 1.5 }],
  },
  {
    id: 9, categorie: "Salé", nom: "Sandwich thon", prix: 7.5, emoji: "🥪", type: "sale",
    composition: "Pain ciabatta, thon, tomates, olives, harissa maison, salade",
    ingredients: ["Pain ciabatta", "Thon", "Tomates", "Olives", "Harissa", "Salade", "Œuf dur"],
    supplements: [{ nom: "Fromage", prix: 1.5 }, { nom: "Double thon", prix: 2.0 }, { nom: "Frites", prix: 3.0 }],
  },
];

const CartIcon = ({ count }) => (
  <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={CREME} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
      <line x1="3" y1="6" x2="21" y2="6"/>
      <path d="M16 10a4 4 0 0 1-8 0"/>
    </svg>
    {count > 0 && (
      <div style={{ position: 'absolute', top: -6, right: -6, background: '#C4A882', color: CREME, borderRadius: '50%', width: 16, height: 16, fontSize: 10, fontFamily: 'sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
        {count}
      </div>
    )}
  </div>
);

const TABLE = 1;

function PopupProduit({ produit, onClose, onAjouter }) {
  const [ingredientsRetires, setIngredientsRetires] = useState([]);
  const [supplementsChoisis, setSupplementsChoisis] = useState([]);

  const toggleIngredient = (ing) => {
    setIngredientsRetires(prev => prev.includes(ing) ? prev.filter(i => i !== ing) : [...prev, ing]);
  };

  const toggleSupplement = (sup) => {
    setSupplementsChoisis(prev => prev.find(s => s.nom === sup.nom) ? prev.filter(s => s.nom !== sup.nom) : [...prev, sup]);
  };

  const prixSupplements = supplementsChoisis.reduce((acc, s) => acc + s.prix, 0);
  const prixTotal = produit.prix + prixSupplements;

  const handleAjouter = () => {
    onAjouter(produit, ingredientsRetires, supplementsChoisis);
    onClose();
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', zIndex: 200, padding: '20px 16px'
    }} onClick={onClose}>
      <div style={{
        background: CREME, borderRadius: 20, padding: 24,
        width: '100%', maxWidth: 500, maxHeight: '88vh', overflowY: 'auto',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
      }} onClick={e => e.stopPropagation()}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div style={{ fontSize: 48 }}>{produit.emoji}</div>
          <button onClick={onClose} style={{ background: '#F0EBE3', border: 'none', borderRadius: '50%', width: 32, height: 32, fontSize: 16, cursor: 'pointer', color: '#666', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>

        <h2 style={{ fontSize: 22, color: '#3D2B1F', fontFamily: 'Georgia, serif', fontStyle: 'italic', margin: '0 0 6px' }}>{produit.nom}</h2>
        <div style={{ fontSize: 18, color: BRUN, fontFamily: 'sans-serif', fontWeight: 700, marginBottom: 20 }}>
          {prixTotal.toFixed(2)} TND
          {prixSupplements > 0 && <span style={{ fontSize: 12, color: '#8B7355', fontWeight: 400, marginLeft: 8 }}>({produit.prix.toFixed(2)} + {prixSupplements.toFixed(2)} suppléments)</span>}
        </div>

        {produit.provenance && (
          <div style={{ background: CREME2, borderRadius: 10, padding: '10px 14px', marginBottom: 14, border: `0.5px solid ${BRUN_LIGHT}` }}>
            <div style={{ fontSize: 10, color: '#8B7355', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4, fontFamily: 'sans-serif' }}>Provenance</div>
            <div style={{ fontSize: 13, color: '#3D2B1F', fontFamily: 'sans-serif' }}>{produit.provenance}</div>
          </div>
        )}

        {produit.composition && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 10, color: '#8B7355', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6, fontFamily: 'sans-serif' }}>Composition</div>
            <div style={{ fontSize: 13, color: '#3D2B1F', fontFamily: 'sans-serif', lineHeight: 1.6 }}>{produit.composition}</div>
          </div>
        )}

        {produit.type === 'sale' && produit.ingredients && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 10, color: '#8B7355', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, fontFamily: 'sans-serif' }}>Retirer des ingrédients</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {produit.ingredients.map((ing, i) => {
                const retire = ingredientsRetires.includes(ing);
                return (
                  <button key={i} onClick={() => toggleIngredient(ing)}
                    style={{
                      padding: '6px 14px', borderRadius: 20, fontSize: 12, fontFamily: 'sans-serif',
                      border: `0.5px solid ${retire ? '#EF4444' : BRUN_LIGHT}`,
                      background: retire ? '#FEE2E2' : '#FFF',
                      color: retire ? '#EF4444' : '#3D2B1F',
                      cursor: 'pointer', textDecoration: retire ? 'line-through' : 'none'
                    }}>
                    {ing}
                  </button>
                );
              })}
            </div>
            {ingredientsRetires.length > 0 && (
              <div style={{ fontSize: 11, color: '#EF4444', marginTop: 8, fontFamily: 'sans-serif' }}>
                ✕ Sans : {ingredientsRetires.join(', ')}
              </div>
            )}
          </div>
        )}

        {produit.type === 'sale' && produit.supplements && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 10, color: '#8B7355', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, fontFamily: 'sans-serif' }}>Ajouter un supplément</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {produit.supplements.map((sup, i) => {
                const choisi = supplementsChoisis.find(s => s.nom === sup.nom);
                return (
                  <button key={i} onClick={() => toggleSupplement(sup)}
                    style={{
                      padding: '12px 16px', borderRadius: 12, fontSize: 13, fontFamily: 'sans-serif',
                      border: `0.5px solid ${choisi ? BRUN : BRUN_LIGHT}`,
                      background: choisi ? BRUN : '#FFF',
                      color: choisi ? CREME : '#3D2B1F',
                      cursor: 'pointer', textAlign: 'left',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                    }}>
                    <span>+ {sup.nom}</span>
                    <span style={{ fontWeight: 600 }}>{choisi ? '✓ ' : ''}{sup.prix.toFixed(2)} TND</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <button onClick={handleAjouter}
          style={{ width: '100%', padding: '16px', borderRadius: 30, border: 'none', background: BRUN, color: CREME, cursor: 'pointer', fontFamily: 'sans-serif', fontSize: 15, fontWeight: 600 }}>
          Ajouter au panier — {prixTotal.toFixed(2)} TND
        </button>
      </div>
    </div>
  );
}

function App() {
  const [panier, setPanier] = useState([]);
  const [commandesTable, setCommandesTable] = useState([]);
  const [categorieActive, setCategorieActive] = useState("Boissons");
  const [vue, setVue] = useState('menu');
  const [envoiOk, setEnvoiOk] = useState(false);
  const [popupProduit, setPopupProduit] = useState(null);
  const [stocksProduits, setStocksProduits] = useState({});

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'stocks', 'produits'), (snap) => {
      if (snap.exists()) setStocksProduits(snap.data());
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'commandes'), where('table', '==', TABLE));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .filter(c => c.statut !== 'termine')
        .sort((a, b) => (a.heure?.seconds || 0) - (b.heure?.seconds || 0));
      setCommandesTable(data);
    });
    return () => unsub();
  }, []);

  const categories = [...new Set(menu.map(p => p.categorie))];
  const produitsFiltres = menu.filter(p => p.categorie === categorieActive);

  const prixReel = (item) => item.prix + (item.supplementsChoisis || []).reduce((acc, s) => acc + s.prix, 0);
  const total = panier.reduce((acc, p) => acc + prixReel(p) * p.quantite, 0);
  const nbArticles = panier.reduce((acc, p) => acc + p.quantite, 0);

  const ajouterAuPanier = (produit, ingredientsRetires = [], supplementsChoisis = []) => {
    const stockProduit = stocksProduits[produit.id];
    if (stockProduit?.actif) {
      const qtePanier = panier.filter(p => p.id === produit.id).reduce((acc, p) => acc + p.quantite, 0);
      if (qtePanier + 1 > stockProduit.stock) return;
    }
    const cle = `${produit.id}-${ingredientsRetires.join(',')}-${supplementsChoisis.map(s => s.nom).join(',')}`;
    const existe = panier.find(p => p.cle === cle);
    if (existe) {
      setPanier(panier.map(p => p.cle === cle ? { ...p, quantite: p.quantite + 1 } : p));
    } else {
      setPanier([...panier, { ...produit, cle, quantite: 1, ingredientsRetires, supplementsChoisis }]);
    }
  };

  const diminuer = (cle) => {
    const item = panier.find(p => p.cle === cle);
    if (item.quantite === 1) setPanier(panier.filter(p => p.cle !== cle));
    else setPanier(panier.map(p => p.cle === cle ? { ...p, quantite: p.quantite - 1 } : p));
  };

  const supprimer = (cle) => setPanier(panier.filter(p => p.cle !== cle));

  const envoyerCommande = async () => {
    if (panier.length === 0) return;
    const produitsPourFirebase = panier.map(p => ({
      id: p.id, nom: p.nom, prix: prixReel(p), emoji: p.emoji, quantite: p.quantite,
      ingredientsRetires: p.ingredientsRetires || [],
      supplementsChoisis: (p.supplementsChoisis || []).map(s => s.nom),
    }));
    await addDoc(collection(db, 'commandes'), {
      table: TABLE, produits: produitsPourFirebase, total,
      statut: 'en_attente', heure: serverTimestamp()
    });
    const stocksSnap = await getDoc(doc(db, 'stocks', 'produits'));
    if (stocksSnap.exists()) {
      const stocksData = stocksSnap.data();
      const updates = {};
      panier.forEach(p => {
        const s = stocksData[p.id];
        if (s?.actif) updates[`${p.id}.stock`] = Math.max(0, (s.stock || 0) - p.quantite);
      });
      if (Object.keys(updates).length > 0) await updateDoc(doc(db, 'stocks', 'produits'), updates);
    }
    setPanier([]);
    setEnvoiOk(true);
    setTimeout(() => setEnvoiOk(false), 6000);
    setVue('confirmation');
  };

  const statutLabel = (s) => s === 'en_attente' ? 'En attente' : s === 'en_preparation' ? 'En préparation' : 'Prêt à servir';
  const statutColor = (s) => s === 'en_attente' ? '#92400E' : s === 'en_preparation' ? '#1E40AF' : '#166534';
  const statutBg = (s) => s === 'en_attente' ? '#FEF3C7' : s === 'en_preparation' ? '#DBEAFE' : '#DCFCE7';

  const Header = () => (
    <div style={{ background: CREME, borderBottom: `0.5px solid ${BORDER}`, padding: '16px 16px 12px', textAlign: 'center', position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 9, letterSpacing: 2, color: BLEU_LIGHT, textTransform: 'uppercase', fontFamily: 'sans-serif' }}>LA PÂTISSERIE</div>
          <div style={{ fontSize: 24, color: BLEU, fontStyle: 'italic', lineHeight: 1, fontFamily: 'Georgia, serif' }}>d'inès</div>
        </div>
        <div style={{ fontSize: 20, color: '#C4A882', fontStyle: 'italic', margin: '0 4px', fontFamily: 'Georgia, serif' }}>×</div>
        <div style={{ fontSize: 18, color: BRUN, fontWeight: 700, fontFamily: 'sans-serif', letterSpacing: 1 }}>SANS+</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 8 }}>
        <div style={{ background: CREME2, color: BRUN, fontSize: 11, padding: '4px 14px', borderRadius: 20, fontFamily: 'sans-serif', letterSpacing: 1, border: `0.5px solid ${BRUN_LIGHT}` }}>
          TABLE {TABLE}
        </div>
      </div>
      {nbArticles > 0 && (
        <button onClick={() => setVue('panier')}
          style={{
            position: 'absolute', right: 16, top: 16,
            background: BRUN, color: CREME, border: 'none', borderRadius: 20,
            padding: '8px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6
          }}>
          <CartIcon count={nbArticles} />
        </button>
      )}
    </div>
  );

  const NavTop = () => (
    <div style={{ display: 'flex', background: CREME, borderBottom: `0.5px solid ${BORDER}` }}>
      {[
        { key: 'menu', label: 'Menu' },
        { key: 'maTable', label: `Ma table${commandesTable.length > 0 ? ` (${commandesTable.length})` : ''}` },
      ].map(v => (
        <button key={v.key} onClick={() => setVue(v.key)}
          style={{ flex: 1, padding: '12px', border: 'none', background: 'none', color: vue === v.key ? BRUN : '#8B7355', fontFamily: 'sans-serif', fontSize: 13, cursor: 'pointer', borderBottom: vue === v.key ? `2px solid ${BRUN}` : '2px solid transparent', fontWeight: vue === v.key ? 600 : 400 }}>
          {v.label}
        </button>
      ))}
    </div>
  );

  if (vue === 'confirmation') {
    return (
      <div style={{ minHeight: '100vh', background: CREME2, fontFamily: 'Georgia, serif' }}>
        <Header />
        <NavTop />
        <div style={{ padding: 24, textAlign: 'center', paddingTop: 60 }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 28 }}>✓</div>
          <h2 style={{ color: BRUN, fontStyle: 'italic', fontSize: 22, marginBottom: 12 }}>Commande envoyée !</h2>
          <p style={{ color: '#5D4037', fontFamily: 'sans-serif', fontSize: 14, lineHeight: 1.6, marginBottom: 8 }}>Nous préparons votre commande.</p>
          <p style={{ color: '#8B7355', fontFamily: 'sans-serif', fontSize: 13, marginBottom: 32 }}>
            Suivez l'état dans <strong>Ma table</strong>.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 280, margin: '0 auto' }}>
            <button onClick={() => setVue('menu')} style={{ padding: '13px 28px', borderRadius: 30, border: 'none', background: BRUN, color: CREME, cursor: 'pointer', fontFamily: 'sans-serif', fontSize: 14 }}>
              Commander autre chose
            </button>
            <button onClick={() => setVue('maTable')} style={{ padding: '13px 28px', borderRadius: 30, border: `0.5px solid ${BRUN_LIGHT}`, background: 'none', color: BRUN, cursor: 'pointer', fontFamily: 'sans-serif', fontSize: 14 }}>
              Suivre ma table →
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (vue === 'panier') {
    return (
      <div style={{ minHeight: '100vh', background: CREME2, fontFamily: 'Georgia, serif' }}>
        <Header />
        <NavTop />
        <div style={{ padding: 16 }}>
          <button onClick={() => setVue('menu')} style={{ background: 'none', border: `0.5px solid ${BRUN_LIGHT}`, borderRadius: 20, padding: '6px 14px', color: BRUN, fontFamily: 'sans-serif', fontSize: 12, cursor: 'pointer', marginBottom: 20 }}>
            ← Continuer à commander
          </button>
          <h2 style={{ color: BRUN, fontStyle: 'italic', fontSize: 20, marginBottom: 16 }}>Mon panier</h2>
          {panier.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#8B7355', fontFamily: 'sans-serif' }}>Panier vide</div>
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
                {panier.map(item => (
                  <div key={item.cle} style={{ background: '#FFF', borderRadius: 12, padding: 14, border: `0.5px solid ${BORDER}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ fontSize: 28 }}>{item.emoji}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, color: '#3D2B1F', fontStyle: 'italic' }}>{item.nom}</div>
                        <div style={{ fontSize: 13, color: BRUN, fontFamily: 'sans-serif', fontWeight: 600, marginTop: 2 }}>{(prixReel(item) * item.quantite).toFixed(2)} TND</div>
                        {prixReel(item) > item.prix && (
                          <div style={{ fontSize: 11, color: '#8B7355', fontFamily: 'sans-serif' }}>
                            {item.prix.toFixed(2)} + {(prixReel(item) - item.prix).toFixed(2)} TND suppléments
                          </div>
                        )}
                        {item.ingredientsRetires?.length > 0 && (
                          <div style={{ fontSize: 11, color: '#EF4444', fontFamily: 'sans-serif', marginTop: 2 }}>
                            Sans : {item.ingredientsRetires.join(', ')}
                          </div>
                        )}
                        {item.supplementsChoisis?.length > 0 && (
                          <div style={{ fontSize: 11, color: VERT, fontFamily: 'sans-serif', marginTop: 2 }}>
                            + {item.supplementsChoisis.map(s => s.nom).join(', ')}
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <button onClick={() => diminuer(item.cle)} style={{ width: 28, height: 28, borderRadius: '50%', border: `0.5px solid ${BRUN_LIGHT}`, background: CREME, color: BRUN, fontFamily: 'sans-serif', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                        <span style={{ fontFamily: 'sans-serif', fontSize: 14, color: '#3D2B1F', minWidth: 16, textAlign: 'center' }}>{item.quantite}</span>
                        <button onClick={() => ajouterAuPanier(item, item.ingredientsRetires, item.supplementsChoisis)} style={{ width: 28, height: 28, borderRadius: '50%', border: 'none', background: BRUN, color: CREME, fontFamily: 'sans-serif', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                      </div>
                      <button onClick={() => supprimer(item.cle)} style={{ background: 'none', border: 'none', color: '#C4A882', fontSize: 18, cursor: 'pointer' }}>✕</button>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ background: '#FFF', borderRadius: 12, padding: 16, border: `0.5px solid ${BORDER}`, marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'sans-serif', fontSize: 16, color: BRUN, fontWeight: 700 }}>
                  <span>Total</span><span>{total.toFixed(2)} TND</span>
                </div>
              </div>
              <button onClick={envoyerCommande} style={{ width: '100%', padding: '16px', borderRadius: 30, border: 'none', background: BRUN, color: CREME, cursor: 'pointer', fontFamily: 'sans-serif', fontSize: 15, fontWeight: 500 }}>
                Envoyer la commande →
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  if (vue === 'maTable') {
    return (
      <div style={{ minHeight: '100vh', background: CREME2, fontFamily: 'Georgia, serif' }}>
        <Header />
        <NavTop />
        <div style={{ padding: 16 }}>
          <h2 style={{ color: BRUN, fontStyle: 'italic', fontSize: 18, marginBottom: 4 }}>Mes commandes</h2>
          <p style={{ color: '#8B7355', fontFamily: 'sans-serif', fontSize: 12, marginBottom: 16 }}>Suivi en temps réel — Table {TABLE}</p>
          {commandesTable.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#8B7355', fontFamily: 'sans-serif' }}>
              <p>Aucune commande passée</p>
              <button onClick={() => setVue('menu')} style={{ marginTop: 12, padding: '10px 24px', borderRadius: 20, border: 'none', background: BRUN, color: CREME, cursor: 'pointer', fontFamily: 'sans-serif', fontSize: 13 }}>
                Voir le menu →
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {commandesTable.map((cmd, i) => (
                <div key={cmd.id} style={{ background: '#FFF', borderRadius: 12, overflow: 'hidden', border: `0.5px solid ${BORDER}` }}>
                  <div style={{ padding: '8px 14px', background: statutBg(cmd.statut), display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, fontFamily: 'sans-serif', color: '#8B7355' }}>Commande {i + 1}</span>
                    <span style={{ color: statutColor(cmd.statut), fontSize: 11, fontWeight: 600, fontFamily: 'sans-serif' }}>{statutLabel(cmd.statut)}</span>
                  </div>
                  <div style={{ padding: '10px 14px' }}>
                    {cmd.produits.map((p, j) => (
                      <div key={j} style={{ fontSize: 13, color: '#3D2B1F', padding: '3px 0', fontFamily: 'sans-serif' }}>
                        <div>{p.emoji} {p.quantite}× {p.nom}</div>
                        {p.ingredientsRetires?.length > 0 && (
                          <div style={{ fontSize: 11, color: '#EF4444', marginLeft: 20 }}>Sans : {p.ingredientsRetires.join(', ')}</div>
                        )}
                        {p.supplementsChoisis?.length > 0 && (
                          <div style={{ fontSize: 11, color: VERT, marginLeft: 20 }}>+ {Array.isArray(p.supplementsChoisis) ? p.supplementsChoisis.join(', ') : p.supplementsChoisis}</div>
                        )}
                        {p.ajouteParServeur && <span style={{ fontSize: 10, color: '#8B7355', fontStyle: 'italic', marginLeft: 6 }}>— Ajouté par le serveur</span>}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: CREME2, fontFamily: 'Georgia, serif' }}>
      <Header />
      <NavTop />
      {envoiOk && (
        <div style={{ background: '#DCFCE7', color: '#166634', padding: '10px 16px', textAlign: 'center', fontFamily: 'sans-serif', fontSize: 13 }}>
          ✓ Commande envoyée en cuisine !
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, padding: '12px 16px', overflowX: 'auto', background: CREME, borderBottom: `0.5px solid ${BORDER}` }}>
        {categories.map(cat => (
          <button key={cat} onClick={() => setCategorieActive(cat)}
            style={{ padding: '7px 16px', borderRadius: 20, border: `0.5px solid ${categorieActive === cat ? BRUN : BRUN_LIGHT}`, background: categorieActive === cat ? BRUN : CREME, color: categorieActive === cat ? CREME : '#8B7355', cursor: 'pointer', whiteSpace: 'nowrap', fontSize: 12, fontFamily: 'sans-serif' }}>
            {cat}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12, padding: 16, paddingBottom: 100 }}>
        {produitsFiltres.map(produit => {
          const qte = panier.filter(p => p.id === produit.id).reduce((acc, p) => acc + p.quantite, 0);
          const epuise = stocksProduits[produit.id]?.actif && stocksProduits[produit.id]?.stock === 0;
          const stockPlein = !epuise && stocksProduits[produit.id]?.actif && qte >= stocksProduits[produit.id]?.stock;
          return (
            <div key={produit.id}
              onClick={() => !epuise && produit.type !== 'boisson' ? setPopupProduit(produit) : null}
              style={{ background: '#FFF', borderRadius: 12, overflow: 'hidden', border: `0.5px solid ${qte > 0 ? BRUN : BORDER}`, cursor: !epuise && produit.type !== 'boisson' ? 'pointer' : 'default', opacity: epuise ? 0.4 : 1 }}>
              <div style={{ width: '100%', height: 100, background: CREME2, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, position: 'relative' }}>
                {produit.emoji}
                {epuise && (
                  <div style={{ position: 'absolute', top: 8, left: 8, background: '#EF4444', color: '#FFF', borderRadius: 6, fontSize: 10, fontFamily: 'sans-serif', fontWeight: 700, padding: '2px 7px' }}>
                    Épuisé
                  </div>
                )}
                {qte > 0 && (
                  <div style={{ position: 'absolute', top: 8, right: 8, background: BRUN, color: CREME, borderRadius: '50%', width: 20, height: 20, fontSize: 11, fontFamily: 'sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {qte}
                  </div>
                )}
                {produit.type !== 'boisson' && (
                  <div style={{ position: 'absolute', bottom: 6, right: 8, fontSize: 10, color: '#8B7355', fontFamily: 'sans-serif', background: 'rgba(255,255,255,0.85)', padding: '2px 8px', borderRadius: 10 }}>
                    Voir détails
                  </div>
                )}
              </div>
              <div style={{ padding: 10 }}>
                <div style={{ fontSize: 13, color: '#3D2B1F', fontStyle: 'italic', lineHeight: 1.3, marginBottom: 2 }}>{produit.nom}</div>
                {produit.type === 'boisson' && produit.description && (
                  <div style={{ fontSize: 10, color: '#8B7355', fontFamily: 'sans-serif', marginBottom: 6, lineHeight: 1.3 }}>{produit.description}</div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                  <div style={{ fontSize: 13, color: BRUN, fontFamily: 'sans-serif' }}>{produit.prix.toFixed(2)} TND</div>
                  {produit.type === 'boisson' ? (
                    <button onClick={(e) => { e.stopPropagation(); if (!epuise && !stockPlein) ajouterAuPanier(produit); }}
                      disabled={epuise || stockPlein}
                      style={{ width: 26, height: 26, borderRadius: '50%', background: epuise || stockPlein ? '#CCC' : BRUN, color: CREME, border: 'none', fontSize: 18, cursor: epuise || stockPlein ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>
                      +
                    </button>
                  ) : (
                    <div style={{ fontSize: 10, color: '#8B7355', fontFamily: 'sans-serif', fontStyle: 'italic' }}>Appuyer</div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {nbArticles > 0 && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '12px 16px' }}>
          <div onClick={() => setVue('panier')}
            style={{ background: BRUN, color: CREME, padding: '14px 28px', borderRadius: 30, cursor: 'pointer', fontSize: 14, fontFamily: 'sans-serif', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <CartIcon count={nbArticles} />
              <span>{nbArticles} article{nbArticles > 1 ? 's' : ''}</span>
            </div>
            <span>{total.toFixed(2)} TND →</span>
          </div>
        </div>
      )}

      {popupProduit && (
        <PopupProduit
          produit={popupProduit}
          onClose={() => setPopupProduit(null)}
          onAjouter={ajouterAuPanier}
        />
      )}
    </div>
  );
}

export default App;