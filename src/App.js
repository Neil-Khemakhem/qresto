import React, { useState } from 'react';
import { db } from './firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const BRUN = '#7B2B0A';
const CREME = '#FAF7F2';
const CREME2 = '#F0E8DC';
const BLEU = '#7A9AAD';
const BLEU_LIGHT = '#8FA8B8';
const BORDER = '#E8DDD0';
const BRUN_LIGHT = '#D4C4B0';

const menu = [
  { id: 1, categorie: "Boissons", nom: "Café", prix: 3.5, emoji: "☕" },
  { id: 2, categorie: "Boissons", nom: "Matcha Latte", prix: 6.0, emoji: "🍵" },
  { id: 3, categorie: "Boissons", nom: "Jus d'orange", prix: 5.0, emoji: "🍊" },
  { id: 4, categorie: "Sans+", nom: "Mousse au chocolat", prix: 7.0, emoji: "🍫" },
  { id: 5, categorie: "Sans+", nom: "Barre protéinée", prix: 5.5, emoji: "💪" },
  { id: 6, categorie: "Pâtisseries", nom: "Éclair chocolat", prix: 4.5, emoji: "🍮" },
  { id: 7, categorie: "Pâtisseries", nom: "Tarte citron", prix: 5.0, emoji: "🍋" },
  { id: 8, categorie: "Salé", nom: "Avocado toast", prix: 9.0, emoji: "🥑" },
  { id: 9, categorie: "Salé", nom: "Sandwich thon", prix: 7.5, emoji: "🥪" },
];

function App() {
  const [panier, setPanier] = useState([]);
  const [categorieActive, setCategorieActive] = useState("Boissons");
  const [vue, setVue] = useState('menu');
  const [commande, setCommande] = useState(null);
  const tableNumero = 1;

  const categories = [...new Set(menu.map(p => p.categorie))];
  const produitsFiltres = menu.filter(p => p.categorie === categorieActive);
  const total = panier.reduce((acc, p) => acc + p.prix * p.quantite, 0);
  const nbArticles = panier.reduce((acc, p) => acc + p.quantite, 0);

  const ajouterAuPanier = (produit) => {
    const existe = panier.find(p => p.id === produit.id);
    if (existe) {
      setPanier(panier.map(p => p.id === produit.id ? { ...p, quantite: p.quantite + 1 } : p));
    } else {
      setPanier([...panier, { ...produit, quantite: 1 }]);
    }
  };

  const diminuer = (id) => {
    const item = panier.find(p => p.id === id);
    if (item.quantite === 1) {
      setPanier(panier.filter(p => p.id !== id));
    } else {
      setPanier(panier.map(p => p.id === id ? { ...p, quantite: p.quantite - 1 } : p));
    }
  };

  const supprimer = (id) => {
    setPanier(panier.filter(p => p.id !== id));
  };

  const envoyerCommande = async () => {
    if (panier.length === 0) return;
    try {
      await addDoc(collection(db, 'commandes'), {
        table: tableNumero,
        produits: panier,
        total: total,
        statut: 'en_attente',
        heure: serverTimestamp()
      });
      setCommande('envoyee');
      setPanier([]);
      setVue('menu');
    } catch (e) {
      setCommande('erreur');
    }
  };

  const Header = () => (
    <div style={{ background: CREME, borderBottom: `0.5px solid ${BORDER}`, padding: '20px 16px 14px', textAlign: 'center', position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 9, letterSpacing: 2, color: BLEU_LIGHT, textTransform: 'uppercase', fontFamily: 'sans-serif' }}>LA PÂTISSERIE</div>
          <div style={{ fontSize: 26, color: BLEU, fontStyle: 'italic', lineHeight: 1, fontFamily: 'Georgia, serif' }}>d'inès</div>
        </div>
        <div style={{ fontSize: 22, color: '#C4A882', fontStyle: 'italic', margin: '0 4px', fontFamily: 'Georgia, serif' }}>×</div>
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontSize: 20, color: BRUN, fontWeight: 700, fontFamily: 'sans-serif', letterSpacing: 1, lineHeight: 1.4 }}>SANS+</div>
        </div>
      </div>
      <div style={{ display: 'inline-block', background: CREME2, color: BRUN, fontSize: 11, padding: '4px 14px', borderRadius: 20, marginTop: 10, fontFamily: 'sans-serif', letterSpacing: 1, border: `0.5px solid ${BRUN_LIGHT}` }}>
        TABLE {tableNumero}
      </div>
      {nbArticles > 0 && (
        <button onClick={() => setVue('panier')}
          style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', background: BRUN, color: CREME, border: 'none', borderRadius: 20, padding: '6px 12px', fontFamily: 'sans-serif', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
          🛒 {nbArticles}
        </button>
      )}
    </div>
  );

  if (commande === 'envoyee') {
    return (
      <div style={{ minHeight: '100vh', background: CREME2, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Georgia, serif' }}>
        <div style={{ textAlign: 'center', padding: 32 }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>✅</div>
          <h2 style={{ color: BRUN, fontStyle: 'italic', marginBottom: 8 }}>Commande envoyée !</h2>
          <p style={{ color: '#8B7355', fontFamily: 'sans-serif', fontSize: 14 }}>Votre commande est en cours de préparation.</p>
          <p style={{ color: '#8B7355', fontFamily: 'sans-serif', fontSize: 14 }}>Table {tableNumero}</p>
          <button onClick={() => setCommande(null)}
            style={{ marginTop: 24, padding: '12px 28px', borderRadius: 30, border: 'none', background: BRUN, color: CREME, cursor: 'pointer', fontFamily: 'sans-serif', fontSize: 14 }}>
            Commander autre chose
          </button>
        </div>
      </div>
    );
  }

  if (vue === 'panier') {
    return (
      <div style={{ minHeight: '100vh', background: CREME2, fontFamily: 'Georgia, serif' }}>
        <Header />
        <div style={{ padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <button onClick={() => setVue('menu')}
              style={{ background: 'none', border: `0.5px solid ${BRUN_LIGHT}`, borderRadius: 20, padding: '6px 14px', color: BRUN, fontFamily: 'sans-serif', fontSize: 12, cursor: 'pointer' }}>
              ← Continuer à commander
            </button>
          </div>

          <h2 style={{ color: BRUN, fontStyle: 'italic', fontSize: 20, marginBottom: 16 }}>Mon panier</h2>

          {panier.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#8B7355', fontFamily: 'sans-serif', fontSize: 14 }}>
              Votre panier est vide
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                {panier.map(item => (
                  <div key={item.id} style={{ background: '#FFF', borderRadius: 12, padding: 14, border: `0.5px solid ${BORDER}`, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ fontSize: 28 }}>{item.emoji}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, color: '#3D2B1F', fontStyle: 'italic' }}>{item.nom}</div>
                      <div style={{ fontSize: 13, color: BRUN, fontFamily: 'sans-serif', marginTop: 2 }}>{(item.prix * item.quantite).toFixed(2)} TND</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <button onClick={() => diminuer(item.id)}
                        style={{ width: 28, height: 28, borderRadius: '50%', border: `0.5px solid ${BRUN_LIGHT}`, background: CREME, color: BRUN, fontFamily: 'sans-serif', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        −
                      </button>
                      <span style={{ fontFamily: 'sans-serif', fontSize: 14, color: '#3D2B1F', minWidth: 16, textAlign: 'center' }}>{item.quantite}</span>
                      <button onClick={() => ajouterAuPanier(item)}
                        style={{ width: 28, height: 28, borderRadius: '50%', border: 'none', background: BRUN, color: CREME, fontFamily: 'sans-serif', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        +
                      </button>
                    </div>
                    <button onClick={() => supprimer(item.id)}
                      style={{ background: 'none', border: 'none', color: '#C4A882', fontSize: 18, cursor: 'pointer', padding: '0 4px' }}>
                      ✕
                    </button>
                  </div>
                ))}
              </div>

              <div style={{ background: '#FFF', borderRadius: 12, padding: 16, border: `0.5px solid ${BORDER}`, marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'sans-serif', fontSize: 14, color: '#8B7355', marginBottom: 8 }}>
                  <span>{nbArticles} article{nbArticles > 1 ? 's' : ''}</span>
                  <span>{total.toFixed(2)} TND</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'sans-serif', fontSize: 16, color: BRUN, fontWeight: 600, borderTop: `0.5px solid ${BORDER}`, paddingTop: 8 }}>
                  <span>Total</span>
                  <span>{total.toFixed(2)} TND</span>
                </div>
              </div>

              <button onClick={envoyerCommande}
                style={{ width: '100%', padding: '16px', borderRadius: 30, border: 'none', background: BRUN, color: CREME, cursor: 'pointer', fontFamily: 'sans-serif', fontSize: 15, fontWeight: 500 }}>
                Confirmer la commande →
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: CREME2, fontFamily: 'Georgia, serif' }}>
      <Header />
      <div style={{ display: 'flex', gap: 8, padding: '12px 16px', overflowX: 'auto', background: CREME, borderBottom: `0.5px solid ${BORDER}` }}>
        {categories.map(cat => (
          <button key={cat} onClick={() => setCategorieActive(cat)}
            style={{
              padding: '7px 16px', borderRadius: 20, border: `0.5px solid ${categorieActive === cat ? BRUN : BRUN_LIGHT}`,
              background: categorieActive === cat ? BRUN : CREME,
              color: categorieActive === cat ? CREME : '#8B7355',
              cursor: 'pointer', whiteSpace: 'nowrap', fontSize: 12, fontFamily: 'sans-serif'
            }}>{cat}</button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12, padding: 16, paddingBottom: 30 }}>
        {produitsFiltres.map(produit => {
          const qte = panier.find(p => p.id === produit.id)?.quantite || 0;
          return (
            <div key={produit.id} style={{ background: '#FFF', borderRadius: 12, overflow: 'hidden', border: `0.5px solid ${qte > 0 ? BRUN : BORDER}` }}>
              <div style={{ width: '100%', height: 100, background: CREME2, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, position: 'relative' }}>
                {produit.emoji}
                {qte > 0 && (
                  <div style={{ position: 'absolute', top: 8, right: 8, background: BRUN, color: CREME, borderRadius: '50%', width: 20, height: 20, fontSize: 11, fontFamily: 'sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {qte}
                  </div>
                )}
              </div>
              <div style={{ padding: 10 }}>
                <div style={{ fontSize: 13, color: '#3D2B1F', fontStyle: 'italic', lineHeight: 1.3, marginBottom: 6 }}>{produit.nom}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 13, color: BRUN, fontFamily: 'sans-serif' }}>{produit.prix.toFixed(2)} TND</div>
                  <button onClick={() => ajouterAuPanier(produit)}
                    style={{ width: 26, height: 26, borderRadius: '50%', background: BRUN, color: CREME, border: 'none', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif', lineHeight: 1 }}>
                    +
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {panier.length > 0 && (
        <div onClick={() => setVue('panier')}
          style={{
            position: 'fixed', bottom: 16, left: '50%', transform: 'translateX(-50%)',
            background: BRUN, color: CREME, padding: '14px 28px',
            borderRadius: 30, cursor: 'pointer', fontSize: 14,
            whiteSpace: 'nowrap', fontFamily: 'sans-serif',
            display: 'flex', gap: 16, alignItems: 'center'
          }}>
          <span>🛒 {nbArticles} article{nbArticles > 1 ? 's' : ''}</span>
          <span style={{ opacity: 0.6 }}>|</span>
          <span>{total.toFixed(2)} TND →</span>
        </div>
      )}
    </div>
  );
}

export default App;