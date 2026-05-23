import React, { useState } from 'react';
import { db } from './firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const menu = [
  { id: 1, categorie: "Boissons", nom: "Café", prix: 3.5 },
  { id: 2, categorie: "Boissons", nom: "Matcha Latte", prix: 6.0 },
  { id: 3, categorie: "Boissons", nom: "Jus d'orange", prix: 5.0 },
  { id: 4, categorie: "Sans+", nom: "Mousse au chocolat", prix: 7.0 },
  { id: 5, categorie: "Sans+", nom: "Barre protéinée", prix: 5.5 },
  { id: 6, categorie: "Pâtisseries", nom: "Éclair chocolat", prix: 4.5 },
  { id: 7, categorie: "Pâtisseries", nom: "Tarte citron", prix: 5.0 },
  { id: 8, categorie: "Salé", nom: "Avocado toast", prix: 9.0 },
  { id: 9, categorie: "Salé", nom: "Sandwich thon", prix: 7.5 },
];

function App() {
  const [panier, setPanier] = useState([]);
  const [categorieActive, setCategorieActive] = useState("Boissons");
  const [commande, setCommande] = useState(null);

  const tableNumero = 1;
  const categories = [...new Set(menu.map(p => p.categorie))];
  const produitsFiltres = menu.filter(p => p.categorie === categorieActive);

  const ajouterAuPanier = (produit) => {
    const existe = panier.find(p => p.id === produit.id);
    if (existe) {
      setPanier(panier.map(p => p.id === produit.id ? { ...p, quantite: p.quantite + 1 } : p));
    } else {
      setPanier([...panier, { ...produit, quantite: 1 }]);
    }
  };

  const total = panier.reduce((acc, p) => acc + p.prix * p.quantite, 0);

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
    } catch (e) {
      setCommande('erreur');
    }
  };

  if (commande === 'envoyee') {
    return (
      <div style={{ maxWidth: 480, margin: '0 auto', fontFamily: 'sans-serif', padding: 32, textAlign: 'center' }}>
        <div style={{ fontSize: 64 }}>✅</div>
        <h2>Commande envoyée !</h2>
        <p style={{ color: '#888' }}>Votre commande est en cours de préparation.</p>
        <p style={{ color: '#888' }}>Table {tableNumero}</p>
        <button onClick={() => setCommande(null)}
          style={{ marginTop: 24, padding: '12px 24px', borderRadius: 20, border: 'none', background: '#1a1a1a', color: '#fff', cursor: 'pointer' }}>
          Commander autre chose
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', fontFamily: 'sans-serif', padding: 16, paddingBottom: 100 }}>

      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, margin: 0 }}>La Patisserie d'Inès</h1>
        <p style={{ color: '#888', margin: 4 }}>X Sans+ — Table {tableNumero}</p>
      </div>

      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 20 }}>
        {categories.map(cat => (
          <button key={cat} onClick={() => setCategorieActive(cat)}
            style={{
              padding: '8px 16px', borderRadius: 20, border: 'none',
              background: categorieActive === cat ? '#1a1a1a' : '#f0f0f0',
              color: categorieActive === cat ? '#fff' : '#333',
              cursor: 'pointer', whiteSpace: 'nowrap', fontSize: 14
            }}>{cat}</button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {produitsFiltres.map(produit => (
          <div key={produit.id} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: 16, background: '#f9f9f9', borderRadius: 12
          }}>
            <div>
              <div style={{ fontWeight: 600 }}>{produit.nom}</div>
              <div style={{ color: '#888', fontSize: 14 }}>{produit.prix.toFixed(2)} TND</div>
            </div>
            <button onClick={() => ajouterAuPanier(produit)}
              style={{ width: 36, height: 36, borderRadius: '50%', border: 'none', background: '#1a1a1a', color: '#fff', fontSize: 20, cursor: 'pointer' }}>
              +
            </button>
          </div>
        ))}
      </div>

      {panier.length > 0 && (
        <div onClick={envoyerCommande}
          style={{
            position: 'fixed', bottom: 16, left: '50%', transform: 'translateX(-50%)',
            background: '#1a1a1a', color: '#fff', padding: '14px 28px',
            borderRadius: 30, cursor: 'pointer', fontSize: 16, whiteSpace: 'nowrap'
          }}>
          🛒 Commander — {total.toFixed(2)} TND
        </div>
      )}
    </div>
  );
}

export default App;