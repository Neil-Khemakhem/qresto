import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';

function Dashboard() {
  const [commandes, setCommandes] = useState([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'commandes'), (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      const triees = data.sort((a, b) => {
        if (!a.heure || !b.heure) return 0;
        return b.heure.seconds - a.heure.seconds;
      });
      setCommandes(triees);
    });
    return () => unsub();
  }, []);

  const changerStatut = async (id, statut) => {
    await updateDoc(doc(db, 'commandes', id), { statut });
  };

  const couleurStatut = (statut) => {
    if (statut === 'en_attente') return '#FF9800';
    if (statut === 'en_preparation') return '#2196F3';
    if (statut === 'pret') return '#4CAF50';
    return '#999';
  };

  const labelStatut = (statut) => {
    if (statut === 'en_attente') return '⏳ En attente';
    if (statut === 'en_preparation') return '👨‍🍳 En préparation';
    if (statut === 'pret') return '✅ Prêt à servir';
    return statut;
  };

  return (
    <div style={{ fontFamily: 'sans-serif', padding: 24, background: '#f5f5f5', minHeight: '100vh' }}>
      <h1 style={{ margin: 0, fontSize: 22 }}>Dashboard — La Patisserie d'Inès</h1>
      <p style={{ color: '#888', margin: '4px 0 24px' }}>{commandes.length} commande(s)</p>

      {commandes.length === 0 && (
        <div style={{ textAlign: 'center', marginTop: 80, color: '#aaa' }}>
          <div style={{ fontSize: 48 }}>🍽️</div>
          <p>Aucune commande pour l'instant</p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {commandes.map(commande => (
          <div key={commande.id} style={{
            background: '#fff', borderRadius: 12, padding: 20,
            borderLeft: `5px solid ${couleurStatut(commande.statut)}`
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h2 style={{ margin: 0, fontSize: 18 }}>Table {commande.table}</h2>
              <span style={{ background: couleurStatut(commande.statut), color: '#fff', padding: '4px 12px', borderRadius: 20, fontSize: 13 }}>
                {labelStatut(commande.statut)}
              </span>
            </div>

            <div style={{ marginBottom: 12 }}>
              {commande.produits && commande.produits.map((p, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #f0f0f0' }}>
                  <span>{p.quantite}x {p.nom}</span>
                  <span style={{ color: '#888' }}>{(p.prix * p.quantite).toFixed(2)} TND</span>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, fontSize: 16 }}>Total : {commande.total?.toFixed(2)} TND</span>
              <div style={{ display: 'flex', gap: 8 }}>
                {commande.statut === 'en_attente' && (
                  <button onClick={() => changerStatut(commande.id, 'en_preparation')}
                    style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: '#2196F3', color: '#fff', cursor: 'pointer' }}>
                    En préparation
                  </button>
                )}
                {commande.statut === 'en_preparation' && (
                  <button onClick={() => changerStatut(commande.id, 'pret')}
                    style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: '#4CAF50', color: '#fff', cursor: 'pointer' }}>
                    Prêt à servir
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Dashboard;