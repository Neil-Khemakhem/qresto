import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, addDoc, onSnapshot, query, where, serverTimestamp } from 'firebase/firestore';

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

const TABLE = 1;

function App() {
  const [panier, setPanier] = useState([]);
  const [commandesTable, setCommandesTable] = useState([]);
  const [categorieActive, setCategorieActive] = useState("Boissons");
  const [vue, setVue] = useState('menu');
  const [envoiOk, setEnvoiOk] = useState(false);

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
  const total = panier.reduce((acc, p) => acc + p.prix * p.quantite, 0);
  const nbArticles = panier.reduce((acc, p) => acc + p.quantite, 0);

  const ajouterAuPanier = (produit) => {
    const existe = panier.find(p => p.id === produit.id);
    if (existe) setPanier(panier.map(p => p.id === produit.id ? { ...p, quantite: p.quantite + 1 } : p));
    else setPanier([...panier, { ...produit, quantite: 1 }]);
  };

  const diminuer = (id) => {
    const item = panier.find(p => p.id === id);
    if (item.quantite === 1) setPanier(panier.filter(p => p.id !== id));
    else setPanier(panier.map(p => p.id === id ? { ...p, quantite: p.quantite - 1 } : p));
  };

  const supprimer = (id) => setPanier(panier.filter(p => p.id !== id));

  const envoyerCommande = async () => {
    if (panier.length === 0) return;
    await addDoc(collection(db, 'commandes'), {
      table: TABLE, produits: panier, total,
      statut: 'en_attente', heure: serverTimestamp()
    });
    setPanier([]);
    setEnvoiOk(true);
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
        {nbArticles > 0 && (
          <button onClick={() => setVue('panier')}
            style={{ background: BRUN, color: CREME, border: 'none', borderRadius: 20, padding: '4px 14px', fontFamily: 'sans-serif', fontSize: 12, cursor: 'pointer' }}>
            Panier · {nbArticles}
          </button>
        )}
      </div>
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

  // PAGE CONFIRMATION
  if (vue === 'confirmation') {
    return (
      <div style={{ minHeight: '100vh', background: CREME2, fontFamily: 'Georgia, serif' }}>
        <Header />
        <NavTop />
        <div style={{ padding: 24, textAlign: 'center', paddingTop: 60 }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 28 }}>✓</div>
          <h2 style={{ color: BRUN, fontStyle: 'italic', fontSize: 22, marginBottom: 12 }}>Commande envoyée !</h2>
          <p style={{ color: '#5D4037', fontFamily: 'sans-serif', fontSize: 14, lineHeight: 1.6, marginBottom: 8 }}>
            Nous préparons votre commande.
          </p>
          <p style={{ color: '#8B7355', fontFamily: 'sans-serif', fontSize: 13, marginBottom: 32 }}>
            Vous pouvez suivre l'état de vos commandes dans <strong>Ma table</strong>.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 280, margin: '0 auto' }}>
            <button onClick={() => setVue('menu')}
              style={{ padding: '13px 28px', borderRadius: 30, border: 'none', background: BRUN, color: CREME, cursor: 'pointer', fontFamily: 'sans-serif', fontSize: 14 }}>
              Commander autre chose
            </button>
            <button onClick={() => setVue('maTable')}
              style={{ padding: '13px 28px', borderRadius: 30, border: `0.5px solid ${BRUN_LIGHT}`, background: 'none', color: BRUN, cursor: 'pointer', fontFamily: 'sans-serif', fontSize: 14 }}>
              Suivre ma table →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // PAGE PANIER
  if (vue === 'panier') {
    return (
      <div style={{ minHeight: '100vh', background: CREME2, fontFamily: 'Georgia, serif' }}>
        <Header />
        <NavTop />
        <div style={{ padding: 16 }}>
          <button onClick={() => setVue('menu')}
            style={{ background: 'none', border: `0.5px solid ${BRUN_LIGHT}`, borderRadius: 20, padding: '6px 14px', color: BRUN, fontFamily: 'sans-serif', fontSize: 12, cursor: 'pointer', marginBottom: 20 }}>
            ← Continuer à commander
          </button>
          <h2 style={{ color: BRUN, fontStyle: 'italic', fontSize: 20, marginBottom: 16 }}>Mon panier</h2>
          {panier.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#8B7355', fontFamily: 'sans-serif' }}>Panier vide</div>
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
                {panier.map(item => (
                  <div key={item.id} style={{ background: '#FFF', borderRadius: 12, padding: 14, border: `0.5px solid ${BORDER}`, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ fontSize: 28 }}>{item.emoji}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, color: '#3D2B1F', fontStyle: 'italic' }}>{item.nom}</div>
                      <div style={{ fontSize: 13, color: BRUN, fontFamily: 'sans-serif', marginTop: 2 }}>{(item.prix * item.quantite).toFixed(2)} TND</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <button onClick={() => diminuer(item.id)} style={{ width: 28, height: 28, borderRadius: '50%', border: `0.5px solid ${BRUN_LIGHT}`, background: CREME, color: BRUN, fontFamily: 'sans-serif', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                      <span style={{ fontFamily: 'sans-serif', fontSize: 14, color: '#3D2B1F', minWidth: 16, textAlign: 'center' }}>{item.quantite}</span>
                      <button onClick={() => ajouterAuPanier(item)} style={{ width: 28, height: 28, borderRadius: '50%', border: 'none', background: BRUN, color: CREME, fontFamily: 'sans-serif', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                    </div>
                    <button onClick={() => supprimer(item.id)} style={{ background: 'none', border: 'none', color: '#C4A882', fontSize: 18, cursor: 'pointer' }}>✕</button>
                  </div>
                ))}
              </div>
              <div style={{ background: '#FFF', borderRadius: 12, padding: 16, border: `0.5px solid ${BORDER}`, marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'sans-serif', fontSize: 16, color: BRUN, fontWeight: 600 }}>
                  <span>Total</span><span>{total.toFixed(2)} TND</span>
                </div>
              </div>
              <button onClick={envoyerCommande}
                style={{ width: '100%', padding: '16px', borderRadius: 30, border: 'none', background: BRUN, color: CREME, cursor: 'pointer', fontFamily: 'sans-serif', fontSize: 15, fontWeight: 500 }}>
                Envoyer la commande →
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  // PAGE MA TABLE
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
                        <span>{p.emoji} {p.quantite}× {p.nom}</span>
                        {p.ajouteParServeur && (
                          <span style={{ fontSize: 10, color: '#8B7355', fontStyle: 'italic', marginLeft: 6 }}>— Ajouté par le serveur</span>
                        )}
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

  // PAGE MENU
  return (
    <div style={{ minHeight: '100vh', background: CREME2, fontFamily: 'Georgia, serif' }}>
      <Header />
      <NavTop />
      {envoiOk && (
        <div style={{ background: '#DCFCE7', color: '#166534', padding: '10px 16px', textAlign: 'center', fontFamily: 'sans-serif', fontSize: 13 }}>
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
      {nbArticles > 0 && (
        <div style={{ padding: '0 16px 16px' }}>
          <div onClick={() => setVue('panier')}
            style={{ background: BRUN, color: CREME, padding: '14px 28px', borderRadius: 30, cursor: 'pointer', fontSize: 14, fontFamily: 'sans-serif', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Panier · {nbArticles} article{nbArticles > 1 ? 's' : ''}</span>
            <span>{total.toFixed(2)} TND →</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;