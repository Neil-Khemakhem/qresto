import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, addDoc, onSnapshot, query, where, serverTimestamp, doc, getDoc, updateDoc } from 'firebase/firestore';

const BG = '#FAF5F0';
const TEXT = '#1A1A1A';
const TEXT2 = '#999999';
const BORDER = '#EDEDEA';
const BTN = '#7A9BAF';
const EPUISE = '#E24B4A';
const TABLE = 1;

function PopupProduit({ produit, onClose, onAjouter }) {
  const [ingredientsRetires, setIngredientsRetires] = useState([]);
  const [supplementsChoisis, setSupplementsChoisis] = useState([]);

  const toggleIngredient = (ing) =>
    setIngredientsRetires(prev => prev.includes(ing) ? prev.filter(i => i !== ing) : [...prev, ing]);

  const toggleSupplement = (sup) =>
    setSupplementsChoisis(prev =>
      prev.find(s => s.nom === sup.nom) ? prev.filter(s => s.nom !== sup.nom) : [...prev, sup]);

  const prixSupplements = supplementsChoisis.reduce((acc, s) => acc + s.prix, 0);
  const prixTotal = produit.prix + prixSupplements;

  const handleAjouter = () => {
    onAjouter(produit, ingredientsRetires, supplementsChoisis);
    onClose();
  };

  return (
    <div
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}
      onClick={onClose}>
      <div
        style={{ background: '#fff', borderRadius: 20, width: 'calc(100% - 32px)', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}
        onClick={e => e.stopPropagation()}>

        {/* Photo plein largeur */}
        <div style={{ width: '100%', height: 160, background: '#F2E8E0', position: 'relative', flexShrink: 0, borderRadius: '20px 20px 0 0', overflow: 'hidden' }}>
          {produit.photoURL
            ? <img src={produit.photoURL} alt={produit.nom} style={{ width: '100%', height: 160, objectFit: 'cover', display: 'block' }} />
            : <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 52 }}>{produit.emoji}</div>}
          <button onClick={onClose}
            style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(0,0,0,0.28)', border: 'none', borderRadius: '50%', width: 32, height: 32, color: '#fff', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            ✕
          </button>
        </div>

        {/* Contenu */}
        <div style={{ padding: '16px 20px 32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
            <h2 style={{ fontSize: 17, fontWeight: 500, color: TEXT, margin: 0, flex: 1, paddingRight: 12 }}>{produit.nom}</h2>
            <span style={{ fontSize: 15, fontWeight: 500, color: TEXT, flexShrink: 0 }}>{prixTotal.toFixed(2)} TND</span>
          </div>
          {produit.description && (
            <p style={{ fontSize: 12, color: TEXT2, margin: '0 0 14px', lineHeight: 1.5 }}>{produit.description}</p>
          )}
          {prixSupplements > 0 && (
            <p style={{ fontSize: 11, color: TEXT2, margin: '0 0 14px' }}>
              {produit.prix.toFixed(2)} + {prixSupplements.toFixed(2)} TND suppléments
            </p>
          )}

          {produit.provenance && (
            <div style={{ background: '#F7F6F4', borderRadius: 10, padding: '10px 14px', marginBottom: 14 }}>
              <div style={{ fontSize: 10, color: TEXT2, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Provenance</div>
              <div style={{ fontSize: 13, color: TEXT }}>{produit.provenance}</div>
            </div>
          )}

          {produit.composition && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, color: TEXT2, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Composition</div>
              <div style={{ fontSize: 13, color: TEXT, lineHeight: 1.6 }}>{produit.composition}</div>
            </div>
          )}

          {produit.type === 'sale' && produit.ingredients?.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 10, color: TEXT2, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Retirer des ingrédients</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {produit.ingredients.map((ing, i) => {
                  const retire = ingredientsRetires.includes(ing);
                  return (
                    <button key={i} onClick={() => toggleIngredient(ing)}
                      style={{ padding: '6px 14px', borderRadius: 20, fontSize: 12, border: `0.5px solid ${retire ? EPUISE : BORDER}`, background: retire ? '#FEE2E2' : '#fff', color: retire ? EPUISE : TEXT2, cursor: 'pointer', textDecoration: retire ? 'line-through' : 'none' }}>
                      {ing}
                    </button>
                  );
                })}
              </div>
              {ingredientsRetires.length > 0 && (
                <div style={{ fontSize: 11, color: EPUISE, marginTop: 8 }}>✕ Sans : {ingredientsRetires.join(', ')}</div>
              )}
            </div>
          )}

          {produit.type === 'sale' && produit.supplements?.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 10, color: TEXT2, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Ajouter un supplément</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {produit.supplements.map((sup, i) => {
                  const choisi = supplementsChoisis.find(s => s.nom === sup.nom);
                  return (
                    <button key={i} onClick={() => toggleSupplement(sup)}
                      style={{ padding: '12px 16px', borderRadius: 12, fontSize: 13, border: `0.5px solid ${choisi ? BTN : '#DDD'}`, background: choisi ? BTN : 'transparent', color: choisi ? '#fff' : TEXT, cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>+ {sup.nom}</span>
                      <span style={{ fontWeight: 500 }}>{choisi ? '✓ ' : ''}{sup.prix.toFixed(2)} TND</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <button onClick={handleAjouter}
            style={{ width: '100%', padding: '15px', borderRadius: 24, border: 'none', background: BTN, color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 500 }}>
            Ajouter — {prixTotal.toFixed(2)} TND
          </button>
        </div>
      </div>
    </div>
  );
}

function AppNew() {
  const [panier, setPanier] = useState([]);
  const [commandesTable, setCommandesTable] = useState([]);
  const [categorieActive, setCategorieActive] = useState(null);
  const [vue, setVue] = useState('menu');
  const [envoiOk, setEnvoiOk] = useState(false);
  const [popupProduit, setPopupProduit] = useState(null);
  const [stocksProduits, setStocksProduits] = useState({});
  const [menu, setMenu] = useState([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'menu'), (snap) => {
      setMenu(snap.docs.map(d => ({ ...d.data(), id: d.id })).sort((a, b) => Number(a.id) - Number(b.id)));
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (menu.length > 0 && !categorieActive) {
      const cats = [...new Set(menu.filter(p => p.actif !== false).map(p => p.categorie))];
      if (cats.length > 0) setCategorieActive(cats[0]);
    }
  }, [menu, categorieActive]);

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

  const categories = [...new Set(menu.filter(p => p.actif !== false).map(p => p.categorie))];
  const produitsFiltres = menu.filter(p => p.categorie === categorieActive && p.actif !== false);

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

  const statutPillStyle = (s) => {
    if (s === 'en_attente') return { background: '#FFF7ED', color: '#C2600A' };
    if (s === 'en_preparation') return { background: '#EFF6FF', color: '#1D4ED8' };
    return { background: '#F0FFF4', color: '#276749' };
  };
  const statutLabel = (s) => {
    if (s === 'en_attente') return 'En attente';
    if (s === 'en_preparation') return 'En préparation';
    if (s === 'pret') return 'Servi';
    return 'Terminé';
  };

  const Header = () => (
    <div style={{ background: '#fff', borderBottom: `0.5px solid ${BORDER}`, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div>
        <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase', color: TEXT, lineHeight: 1.2 }}>QResto</div>
        <div style={{ fontSize: 10, color: '#BBB', fontStyle: 'italic', marginTop: 2 }}>La Pâtisserie d'Inès × Sans+</div>
      </div>
      <div style={{ border: '0.5px solid #DDD', color: '#888', borderRadius: 20, fontSize: 10, padding: '3px 10px', flexShrink: 0 }}>
        Table {TABLE}
      </div>
    </div>
  );

  const BottomNav = () => (
    <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: 52, background: '#fff', borderTop: `0.5px solid ${BORDER}`, display: 'flex', zIndex: 100 }}>
      {[
        { key: 'menu', label: 'Menu', icon: 'ti-menu-2' },
        { key: 'maTable', label: 'Ma table', icon: 'ti-clock' },
        { key: 'panier', label: 'Panier', icon: 'ti-shopping-bag' },
      ].map(item => {
        const actif = vue === item.key || (vue === 'confirmation' && item.key === 'maTable');
        const showBadge = item.key === 'panier' && nbArticles > 0;
        return (
          <button key={item.key} onClick={() => setVue(item.key)}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, border: 'none', background: 'none', cursor: 'pointer', color: actif ? TEXT : '#BBB' }}>
            <div style={{ position: 'relative' }}>
              <i className={`ti ${item.icon}`} style={{ fontSize: 20 }} />
              {showBadge && (
                <span style={{ position: 'absolute', top: -4, right: -7, background: EPUISE, color: '#fff', borderRadius: '50%', width: 15, height: 15, fontSize: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 500 }}>
                  {nbArticles > 9 ? '9+' : nbArticles}
                </span>
              )}
            </div>
            <span style={{ fontSize: 10, fontWeight: actif ? 500 : 400 }}>{item.label}</span>
          </button>
        );
      })}
    </div>
  );

  if (vue === 'confirmation') {
    return (
      <div style={{ minHeight: '100vh', background: BG, fontFamily: '-apple-system, BlinkMacSystemFont, Inter, sans-serif', paddingBottom: 52 }}>
        <Header />
        <div style={{ padding: 24, textAlign: 'center', paddingTop: 60 }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#F0FFF4', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 22, color: '#276749' }}>✓</div>
          <h2 style={{ color: TEXT, fontSize: 18, fontWeight: 500, marginBottom: 8 }}>Commande envoyée !</h2>
          <p style={{ color: TEXT2, fontSize: 13, lineHeight: 1.6, marginBottom: 24 }}>Nous préparons votre commande. Suivez l'état dans Ma table.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 280, margin: '0 auto' }}>
            <button onClick={() => setVue('menu')}
              style={{ padding: '13px 28px', borderRadius: 24, border: 'none', background: BTN, color: '#fff', cursor: 'pointer', fontSize: 14 }}>
              Commander autre chose
            </button>
            <button onClick={() => setVue('maTable')}
              style={{ padding: '13px 28px', borderRadius: 24, border: `0.5px solid ${BORDER}`, background: 'none', color: TEXT2, cursor: 'pointer', fontSize: 14 }}>
              Suivre ma table →
            </button>
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  if (vue === 'panier') {
    return (
      <div style={{ minHeight: '100vh', background: BG, fontFamily: '-apple-system, BlinkMacSystemFont, Inter, sans-serif', paddingBottom: 72 }}>
        <Header />
        <div style={{ padding: 16 }}>
          <button onClick={() => setVue('menu')}
            style={{ background: 'none', border: `0.5px solid ${BORDER}`, borderRadius: 20, padding: '6px 14px', color: TEXT2, fontSize: 12, cursor: 'pointer', marginBottom: 20 }}>
            ← Continuer à commander
          </button>
          <h2 style={{ fontSize: 17, fontWeight: 500, color: TEXT, marginBottom: 16 }}>Mon panier</h2>
          {panier.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: TEXT2, fontSize: 13 }}>Panier vide</div>
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                {panier.map(item => (
                  <div key={item.cle} style={{ background: '#fff', borderRadius: 12, padding: '10px 12px', border: `0.5px solid ${BORDER}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 52, height: 52, borderRadius: 10, background: '#F2E8E0', flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
                        {item.photoURL
                          ? <img src={item.photoURL} alt="" style={{ width: 52, height: 52, objectFit: 'cover' }} />
                          : item.emoji}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: TEXT }}>{item.nom}</div>
                        <div style={{ fontSize: 13, color: TEXT, marginTop: 2 }}>{(prixReel(item) * item.quantite).toFixed(2)} TND</div>
                        {prixReel(item) > item.prix && (
                          <div style={{ fontSize: 11, color: TEXT2 }}>{item.prix.toFixed(2)} + {(prixReel(item) - item.prix).toFixed(2)} TND suppléments</div>
                        )}
                        {item.ingredientsRetires?.length > 0 && (
                          <div style={{ fontSize: 11, color: EPUISE }}>Sans : {item.ingredientsRetires.join(', ')}</div>
                        )}
                        {item.supplementsChoisis?.length > 0 && (
                          <div style={{ fontSize: 11, color: TEXT2 }}>+ {item.supplementsChoisis.map(s => s.nom).join(', ')}</div>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                        <button onClick={() => diminuer(item.cle)}
                          style={{ width: 28, height: 28, borderRadius: '50%', border: `0.5px solid ${BORDER}`, background: '#fff', color: TEXT, fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                        <span style={{ fontSize: 14, color: TEXT, minWidth: 16, textAlign: 'center' }}>{item.quantite}</span>
                        <button onClick={() => ajouterAuPanier(item, item.ingredientsRetires, item.supplementsChoisis)}
                          style={{ width: 28, height: 28, borderRadius: '50%', border: 'none', background: BTN, color: '#fff', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                      </div>
                      <button onClick={() => supprimer(item.cle)}
                        style={{ background: 'none', border: 'none', color: '#CCC', fontSize: 18, cursor: 'pointer', paddingLeft: 4, flexShrink: 0 }}>✕</button>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ background: '#fff', borderRadius: 12, padding: '12px 14px', border: `0.5px solid ${BORDER}`, marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 500, color: TEXT }}>
                  <span>Total</span><span>{total.toFixed(2)} TND</span>
                </div>
              </div>
              <button onClick={envoyerCommande}
                style={{ width: '100%', padding: '15px', borderRadius: 24, border: 'none', background: BTN, color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 500 }}>
                Envoyer la commande →
              </button>
            </>
          )}
        </div>
        <BottomNav />
      </div>
    );
  }

  if (vue === 'maTable') {
    return (
      <div style={{ minHeight: '100vh', background: BG, fontFamily: '-apple-system, BlinkMacSystemFont, Inter, sans-serif', paddingBottom: 72 }}>
        <Header />
        <div style={{ padding: 16 }}>
          <h2 style={{ fontSize: 17, fontWeight: 500, color: TEXT, marginBottom: 4 }}>Mes commandes</h2>
          <p style={{ color: TEXT2, fontSize: 12, marginBottom: 16 }}>Suivi en temps réel — Table {TABLE}</p>
          {commandesTable.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: TEXT2, fontSize: 13 }}>
              <p>Aucune commande passée</p>
              <button onClick={() => setVue('menu')}
                style={{ marginTop: 12, padding: '10px 24px', borderRadius: 24, border: 'none', background: BTN, color: '#fff', cursor: 'pointer', fontSize: 13 }}>
                Voir le menu →
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {commandesTable.map((cmd, i) => (
                <div key={cmd.id} style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', border: `0.5px solid ${BORDER}` }}>
                  <div style={{ padding: '8px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `0.5px solid ${BORDER}` }}>
                    <span style={{ fontSize: 12, color: TEXT2 }}>Commande {i + 1}</span>
                    <span style={{ ...statutPillStyle(cmd.statut), padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 500 }}>
                      {statutLabel(cmd.statut)}
                    </span>
                  </div>
                  <div style={{ padding: '10px 14px' }}>
                    {cmd.produits.map((p, j) => (
                      <div key={j} style={{ fontSize: 13, color: TEXT, padding: '3px 0' }}>
                        <div>{p.emoji} {p.quantite}× {p.nom}</div>
                        {p.ingredientsRetires?.length > 0 && (
                          <div style={{ fontSize: 11, color: EPUISE, marginLeft: 20 }}>Sans : {p.ingredientsRetires.join(', ')}</div>
                        )}
                        {p.supplementsChoisis?.length > 0 && (
                          <div style={{ fontSize: 11, color: TEXT2, marginLeft: 20 }}>+ {Array.isArray(p.supplementsChoisis) ? p.supplementsChoisis.join(', ') : p.supplementsChoisis}</div>
                        )}
                        {p.ajouteParServeur && (
                          <span style={{ fontSize: 10, color: TEXT2, fontStyle: 'italic', marginLeft: 20 }}>— Ajouté par le serveur</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <BottomNav />
      </div>
    );
  }

  // Vue menu principale
  return (
    <div style={{ minHeight: '100vh', background: BG, fontFamily: '-apple-system, BlinkMacSystemFont, Inter, sans-serif', paddingBottom: 72 }}>
      <Header />

      {envoiOk && (
        <div style={{ background: '#F0FFF4', color: '#276749', padding: '10px 16px', textAlign: 'center', fontSize: 12, fontWeight: 500 }}>
          ✓ Commande envoyée en cuisine !
        </div>
      )}

      {/* Catégories */}
      <div style={{ display: 'flex', overflowX: 'auto', background: '#fff', borderBottom: `0.5px solid ${BORDER}`, scrollbarWidth: 'none', padding: '0 8px' }}>
        {categories.map(cat => (
          <button key={cat} onClick={() => setCategorieActive(cat)}
            style={{
              padding: '10px 12px', whiteSpace: 'nowrap', fontSize: 13, cursor: 'pointer',
              border: 'none',
              borderBottom: categorieActive === cat ? `2px solid ${BTN}` : '2px solid transparent',
              background: 'transparent',
              color: categorieActive === cat ? '#1A1A1A' : '#999',
              fontWeight: categorieActive === cat ? 500 : 400,
            }}>
            {cat}
          </button>
        ))}
      </div>

      {/* Liste produits */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '12px 16px' }}>
        {produitsFiltres.map(produit => {
          const qte = panier.filter(p => p.id === produit.id).reduce((acc, p) => acc + p.quantite, 0);
          const epuise = stocksProduits[produit.id]?.actif && stocksProduits[produit.id]?.stock === 0;
          const stockPlein = !epuise && stocksProduits[produit.id]?.actif && qte >= stocksProduits[produit.id]?.stock;
          const panierItem = panier.filter(p => p.id === produit.id).slice(-1)[0];

          const handleTap = () => {
            if (epuise) return;
            if (produit.type !== 'boisson') setPopupProduit(produit);
            else if (!stockPlein) ajouterAuPanier(produit);
          };

          return (
            <div key={produit.id}
              style={{ background: '#fff', borderRadius: 12, border: `0.5px solid ${BORDER}`, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 12, opacity: epuise ? 0.4 : 1 }}>

              {/* Photo / Emoji */}
              <div
                onClick={handleTap}
                style={{ width: 72, height: 72, borderRadius: 10, background: '#F2E8E0', flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, cursor: epuise ? 'default' : 'pointer' }}>
                {produit.photoURL
                  ? <img src={produit.photoURL} alt={produit.nom} style={{ width: 72, height: 72, objectFit: 'cover' }} />
                  : produit.emoji}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0, cursor: produit.type !== 'boisson' && !epuise ? 'pointer' : 'default' }} onClick={handleTap}>
                <div style={{ fontSize: 13, fontWeight: 500, color: TEXT, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <span>{produit.nom}</span>
                  {epuise && (
                    <span style={{ fontSize: 10, background: EPUISE, color: '#fff', borderRadius: 4, padding: '1px 5px' }}>Épuisé</span>
                  )}
                  {qte > 0 && !epuise && (
                    <span style={{ fontSize: 10, background: BTN, color: '#fff', borderRadius: 10, padding: '1px 6px', fontWeight: 500 }}>{qte}</span>
                  )}
                </div>
                {produit.description && (
                  <div style={{ fontSize: 11, color: TEXT2, marginTop: 2, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {produit.description}
                  </div>
                )}
                <div style={{ fontSize: 13, color: TEXT, marginTop: 4 }}>{produit.prix.toFixed(2)} TND</div>
              </div>

              {/* Contrôles quantité ou bouton + */}
              {qte > 0 && produit.type === 'boisson' ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  <button
                    onClick={() => panierItem && diminuer(panierItem.cle)}
                    style={{ width: 28, height: 28, borderRadius: '50%', border: `0.5px solid ${BORDER}`, background: '#fff', color: TEXT, fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                  <span style={{ fontSize: 13, fontWeight: 500, color: TEXT, minWidth: 16, textAlign: 'center' }}>{qte}</span>
                  <button
                    onClick={() => { if (!stockPlein) ajouterAuPanier(produit); }}
                    disabled={stockPlein}
                    style={{ width: 28, height: 28, borderRadius: '50%', border: 'none', background: stockPlein ? '#DDD' : BTN, color: '#fff', fontSize: 18, cursor: stockPlein ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>+</button>
                </div>
              ) : (
                <button
                  onClick={(e) => { e.stopPropagation(); handleTap(); }}
                  disabled={epuise || stockPlein}
                  style={{ width: 28, height: 28, borderRadius: '50%', border: 'none', background: epuise || stockPlein ? '#DDD' : BTN, color: '#fff', fontSize: 18, cursor: epuise || stockPlein ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, lineHeight: 1 }}>+</button>
              )}
            </div>
          );
        })}
      </div>

      {popupProduit && (
        <PopupProduit
          produit={popupProduit}
          onClose={() => setPopupProduit(null)}
          onAjouter={ajouterAuPanier}
        />
      )}

      <BottomNav />
    </div>
  );
}

export default AppNew;
