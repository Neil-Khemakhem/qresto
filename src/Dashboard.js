import React, { useState, useEffect, useRef } from 'react';
import { db } from './firebase';
import { collection, onSnapshot, doc, updateDoc, addDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';

const BRUN = '#7B2B0A';
const CREME = '#FAF7F2';
const CREME2 = '#F0E8DC';
const BLEU = '#7A9AAD';
const BORDER = '#E8DDD0';

const CATALOGUE = [
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

const MDP_STATS = "boss2025";

const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
  </svg>
);

const RestoreIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>
  </svg>
);

function Dashboard() {
  const [commandes, setCommandes] = useState([]);
  const [historique, setHistorique] = useState([]);
  const [corbeille, setCorbeille] = useState([]);
  const [vue, setVue] = useState('commandes');
  const [commandeSelectee, setCommandeSelectee] = useState(null);
  const [commandeSelecteeLive, setCommandeSelecteeLive] = useState(null);
  const [stocks, setStocks] = useState({});
  const [mdpStats, setMdpStats] = useState('');
  const [statsDebloquees, setStatsDebloquees] = useState(false);
  const [mdpErreur, setMdpErreur] = useState(false);
  const [modifie, setModifie] = useState(false);
  const [paiementsTable, setPaiementsTable] = useState({});

  useEffect(() => {
    const unsub1 = onSnapshot(collection(db, 'commandes'), (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .filter(c => c.statut !== 'termine')
        .sort((a, b) => (b.heure?.seconds || 0) - (a.heure?.seconds || 0));
      setCommandes(data);
      if (commandeSelectee) {
        const updated = data.find(c => c.id === commandeSelectee.id);
        if (updated) {
          setCommandeSelecteeLive(updated);
        }
      }
    });
    const unsub2 = onSnapshot(collection(db, 'historique'), (snap) => {
      setHistorique(snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.heureCloture?.seconds || 0) - (a.heureCloture?.seconds || 0)));
    });
    return () => { unsub1(); unsub2(); };
  }, [commandeSelectee]);

  const ouvrirModifier = (commande) => {
    setCommandeSelectee(commande);
    setCommandeSelecteeLive(commande);
    setModifie(false);
  };

  const changerStatut = async (id, statut) => {
    await updateDoc(doc(db, 'commandes', id), { statut });
    if (statut === 'pret') {
      setTimeout(async () => {
        await updateDoc(doc(db, 'commandes', id), { statut: 'termine' });
      }, 5000);
    }
  };

  const supprimerCommande = async (commande) => {
    setCorbeille(c => [commande, ...c.slice(0, 4)]);
    await deleteDoc(doc(db, 'commandes', commande.id));
  };

  const restaurerCommande = async (commande) => {
    await addDoc(collection(db, 'commandes'), {
      table: commande.table, produits: commande.produits, total: commande.total,
      statut: 'en_attente', heure: serverTimestamp(), restauree: true
    });
    setCorbeille(c => c.filter(x => x.id !== commande.id));
  };

  const ajouterArticle = async (commande, produit, parServeur = false) => {
    const live = commandeSelecteeLive || commande;
    const produits = [...(live.produits || [])];
    const existe = produits.find(p => p.id === produit.id && !p.ajouteParServeur);
    if (existe && !parServeur) {
      existe.quantite += 1;
    } else {
      produits.push({ ...produit, quantite: 1, ajouteParServeur: parServeur });
    }
    const total = produits.reduce((acc, p) => acc + p.prix * p.quantite, 0);
    await updateDoc(doc(db, 'commandes', commande.id), { produits, total });
    setModifie(true);
  };

  const diminuerArticle = async (commande, produitIdx) => {
    const live = commandeSelecteeLive || commande;
    const produits = [...(live.produits || [])];
    if (produits[produitIdx].quantite <= 1) {
      produits.splice(produitIdx, 1);
    } else {
      produits[produitIdx] = { ...produits[produitIdx], quantite: produits[produitIdx].quantite - 1 };
    }
    const total = produits.reduce((acc, p) => acc + p.prix * p.quantite, 0);
    await updateDoc(doc(db, 'commandes', commande.id), { produits, total });
    setModifie(true);
  };

  const supprimerArticle = async (commande, produitIdx) => {
    const live = commandeSelecteeLive || commande;
    const produits = (live.produits || []).filter((_, i) => i !== produitIdx);
    const total = produits.reduce((acc, p) => acc + p.prix * p.quantite, 0);
    await updateDoc(doc(db, 'commandes', commande.id), { produits, total });
    setModifie(true);
  };

  const cloturerTable = async (table) => {
    const cmdsTable = commandes.filter(c => c.table === table);
    const total = cmdsTable.reduce((acc, c) => acc + (c.total || 0), 0);
    const paiements = paiementsTable[table] || [];
    await addDoc(collection(db, 'historique'), {
      table, commandes: cmdsTable, total, paiements,
      heureCloture: serverTimestamp(),
      date: new Date().toLocaleDateString('fr-FR'),
    });
    for (const cmd of cmdsTable) {
      await updateDoc(doc(db, 'commandes', cmd.id), { statut: 'termine' });
    }
    setPaiementsTable(p => { const n = { ...p }; delete n[table]; return n; });
  };

  const ajouterPaiement = (table, montant, mode) => {
    setPaiementsTable(p => ({
      ...p,
      [table]: [...(p[table] || []), { montant: parseFloat(montant), mode, heure: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) }]
    }));
  };

  const tables = [...new Set(commandes.map(c => c.table))].sort((a, b) => a - b);
  const commandesParTable = (table) => commandes.filter(c => c.table === table);
  const totalTable = (table) => commandesParTable(table).reduce((acc, c) => acc + (c.total || 0), 0);
  const totalPaye = (table) => (paiementsTable[table] || []).reduce((acc, p) => acc + p.montant, 0);
  const resteAPayer = (table) => Math.max(0, totalTable(table) - totalPaye(table));

  const nbAttente = commandes.filter(c => c.statut === 'en_attente').length;
  const nbPrep = commandes.filter(c => c.statut === 'en_preparation').length;
  const nbPret = commandes.filter(c => c.statut === 'pret').length;

  const statutLabel = (s) => s === 'en_attente' ? 'En attente' : s === 'en_preparation' ? 'En préparation' : 'Prêt';
  const statutColor = (s) => s === 'en_attente' ? '#92400E' : s === 'en_preparation' ? '#1E40AF' : '#166534';
  const statutBg = (s) => s === 'en_attente' ? '#FEF3C7' : s === 'en_preparation' ? '#DBEAFE' : '#DCFCE7';
  const formatHeure = (h) => !h ? '' : new Date(h.seconds * 1000).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  const today = new Date().toLocaleDateString('fr-FR');
  const histoAujourdhui = historique.filter(h => h.date === today);
  const totalJour = histoAujourdhui.reduce((acc, h) => acc + (h.total || 0), 0);
  const ticketMoyen = histoAujourdhui.length > 0 ? totalJour / histoAujourdhui.length : 0;

  const produitsPlusVendus = () => {
    const map = {};
    histoAujourdhui.forEach(h => {
      (h.commandes || []).forEach(cmd => {
        (cmd.produits || []).forEach(p => {
          if (!map[p.nom]) map[p.nom] = 0;
          map[p.nom] += p.quantite;
        });
      });
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5);
  };

  const tablePlusRentable = () => {
    const map = {};
    histoAujourdhui.forEach(h => {
      if (!map[h.table]) map[h.table] = 0;
      map[h.table] += h.total || 0;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1])[0] || null;
  };

  const [montantPaiement, setMontantPaiement] = useState('');
  const [modePaiement, setModePaiement] = useState('especes');
  const [tablePopup, setTablePopup] = useState(null);

  return (
    <div style={{ minHeight: '100vh', background: CREME2, fontFamily: 'sans-serif' }}>

      <div style={{ background: CREME, borderBottom: `0.5px solid ${BORDER}`, padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 20, color: BLEU, fontStyle: 'italic', fontFamily: 'Georgia, serif' }}>d'inès</span>
          <span style={{ fontSize: 16, color: '#C4A882', fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>×</span>
          <span style={{ fontSize: 14, color: BRUN, fontWeight: 700, letterSpacing: 1 }}>SANS+</span>
          <span style={{ color: '#DDD', margin: '0 8px' }}>|</span>
          <span style={{ fontSize: 13, color: '#666' }}>Dashboard gérant</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {[
            { key: 'commandes', label: `Commandes${nbAttente > 0 ? ` (${nbAttente})` : ''}` },
            { key: 'additions', label: 'Additions' },
            { key: 'historique', label: 'Historique' },
            { key: 'stocks', label: 'Stocks' },
            { key: 'stats', label: 'Stats' },
          ].map(v => (
            <button key={v.key} onClick={() => setVue(v.key)}
              style={{ padding: '7px 14px', borderRadius: 6, border: `0.5px solid ${vue === v.key ? '#1a1a1a' : '#DDD'}`, background: vue === v.key ? '#1a1a1a' : CREME, color: vue === v.key ? '#FFF' : '#666', cursor: 'pointer', fontSize: 12, fontWeight: 500 }}>
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {vue === 'commandes' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, padding: '16px 24px' }}>
            {[
              { label: 'En attente', value: nbAttente, color: '#92400E', bg: '#FEF3C7' },
              { label: 'En préparation', value: nbPrep, color: '#1E40AF', bg: '#DBEAFE' },
              { label: 'Prêts', value: nbPret, color: '#166534', bg: '#DCFCE7' },
            ].map((s, i) => (
              <div key={i} style={{ background: s.bg, borderRadius: 8, padding: '14px 16px', border: `0.5px solid ${BORDER}` }}>
                <div style={{ fontSize: 11, color: '#666', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>{s.label}</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>

          {corbeille.length > 0 && (
            <div style={{ margin: '0 24px 16px', background: '#FFFDE7', borderRadius: 8, padding: '12px 16px', border: `0.5px solid #E8D44D` }}>
              <div style={{ fontSize: 11, color: '#666', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>Commandes supprimées — restaurer</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {corbeille.map((cmd, i) => (
                  <button key={i} onClick={() => restaurerCommande(cmd)}
                    style={{ padding: '6px 12px', borderRadius: 6, border: `0.5px solid #C8B400`, background: '#FFF', color: '#7B6000', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <RestoreIcon /> Table {cmd.table} — {cmd.total?.toFixed(2)} TND
                  </button>
                ))}
              </div>
            </div>
          )}

          {commandes.length === 0 && <div style={{ textAlign: 'center', marginTop: 80, color: '#999' }}>Aucune commande en cours</div>}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14, padding: '0 24px 24px' }}>
            {commandes.map(commande => (
              <div key={commande.id} style={{ background: '#FFF', borderRadius: 10, overflow: 'hidden', border: `0.5px solid ${BORDER}`, borderTop: `3px solid ${statutColor(commande.statut)}` }}>
                <div style={{ padding: '12px 16px', borderBottom: `0.5px solid #F0F0F0`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: 16, fontWeight: 700, color: '#1a1a1a' }}>Table {commande.table}</span>
                    <span style={{ fontSize: 12, color: '#999', marginLeft: 8 }}>{formatHeure(commande.heure)}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ background: statutBg(commande.statut), color: statutColor(commande.statut), padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>
                      {statutLabel(commande.statut)}
                    </span>
                    <button onClick={() => supprimerCommande(commande)} title="Supprimer"
                      style={{ background: 'none', border: `0.5px solid #DDD`, borderRadius: 6, cursor: 'pointer', color: '#999', padding: '5px 7px', display: 'flex', alignItems: 'center' }}>
                      <TrashIcon />
                    </button>
                  </div>
                </div>
                <div style={{ padding: '10px 16px', borderBottom: `0.5px solid #F0F0F0` }}>
                  {commande.produits?.map((p, i) => (
                    <div key={i} style={{ padding: '3px 0', fontSize: 13 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#333' }}>
                        <span>{p.quantite}× {p.nom}</span>
                        <span style={{ color: '#999' }}>{(p.prix * p.quantite).toFixed(2)} TND</span>
                      </div>
                      {p.ajouteParServeur && (
                        <div style={{ fontSize: 10, color: '#8B7355', fontStyle: 'italic' }}>— Ajouté par le serveur</div>
                      )}
                    </div>
                  ))}
                </div>
                <div style={{ padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, fontSize: 15, color: BRUN }}>{commande.total?.toFixed(2)} TND</span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => ouvrirModifier(commande)}
                      style={{ padding: '6px 12px', borderRadius: 6, border: `0.5px solid #DDD`, background: CREME, color: '#1a1a1a', cursor: 'pointer', fontSize: 12 }}>
                      Modifier
                    </button>
                    {commande.statut === 'en_attente' && (
                      <button onClick={() => changerStatut(commande.id, 'en_preparation')}
                        style={{ padding: '6px 12px', borderRadius: 6, border: 'none', background: '#DBEAFE', color: '#1E40AF', cursor: 'pointer', fontSize: 12, fontWeight: 500 }}>
                        En préparation
                      </button>
                    )}
                    {commande.statut === 'en_preparation' && (
                      <button onClick={() => changerStatut(commande.id, 'pret')}
                        style={{ padding: '6px 12px', borderRadius: 6, border: 'none', background: '#DCFCE7', color: '#166534', cursor: 'pointer', fontSize: 12, fontWeight: 500 }}>
                        Prêt ✓
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {vue === 'additions' && (
        <div style={{ padding: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: '#1a1a1a', marginBottom: 4 }}>Additions par table</h2>
          <p style={{ fontSize: 13, color: '#888', marginBottom: 20 }}>Gérez les paiements partiels et clôturez quand tout est réglé.</p>
          {tables.length === 0 && <div style={{ textAlign: 'center', marginTop: 60, color: '#999' }}>Aucune table active</div>}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
            {tables.map(table => {
              const cmds = commandesParTable(table);
              const total = totalTable(table);
              const paiements = paiementsTable[table] || [];
              const paye = totalPaye(table);
              const reste = resteAPayer(table);
              const toutRegle = reste === 0 && paiements.length > 0;
              return (
                <div key={table} style={{ background: '#FFF', borderRadius: 10, overflow: 'hidden', border: `0.5px solid ${BORDER}`, borderTop: `3px solid ${toutRegle ? '#166534' : BRUN}` }}>
                  <div style={{ padding: '12px 16px', borderBottom: `0.5px solid #F0F0F0`, display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 16, fontWeight: 700 }}>Table {table}</span>
                    <span style={{ fontSize: 12, color: toutRegle ? '#166534' : '#92400E', fontWeight: 600 }}>{toutRegle ? '✓ Tout réglé' : 'En cours'}</span>
                  </div>

                  <div style={{ padding: '10px 16px', borderBottom: `0.5px solid #F0F0F0` }}>
                    {cmds.map((cmd, i) => (
                      <div key={cmd.id} style={{ marginBottom: i < cmds.length - 1 ? 8 : 0 }}>
                        <div style={{ fontSize: 11, color: '#999', marginBottom: 3 }}>Commande {i + 1} — {formatHeure(cmd.heure)}</div>
                        {cmd.produits?.map((p, j) => (
                          <div key={j} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#333', padding: '2px 0' }}>
                            <span>{p.quantite}× {p.nom}</span>
                            <span style={{ color: '#999' }}>{(p.prix * p.quantite).toFixed(2)} TND</span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>

                  {paiements.length > 0 && (
                    <div style={{ padding: '10px 16px', borderBottom: `0.5px solid #F0F0F0`, background: '#F9F9F9' }}>
                      <div style={{ fontSize: 11, color: '#666', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Paiements reçus</div>
                      {paiements.map((p, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#333', padding: '3px 0' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ background: p.mode === 'carte' ? '#DBEAFE' : '#DCFCE7', color: p.mode === 'carte' ? '#1E40AF' : '#166534', padding: '1px 8px', borderRadius: 10, fontSize: 10, fontWeight: 600 }}>
                              {p.mode === 'carte' ? 'Carte' : 'Espèces'}
                            </span>
                            {p.heure}
                          </span>
                          <span style={{ fontWeight: 600, color: '#166534' }}>−{p.montant.toFixed(2)} TND</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div style={{ padding: '12px 16px', borderBottom: `0.5px solid #F0F0F0` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                      <span style={{ color: '#666' }}>Total</span>
                      <span style={{ fontWeight: 600 }}>{total.toFixed(2)} TND</span>
                    </div>
                    {paye > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                        <span style={{ color: '#666' }}>Payé</span>
                        <span style={{ color: '#166534', fontWeight: 600 }}>−{paye.toFixed(2)} TND</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 700, color: reste === 0 && paye > 0 ? '#166534' : BRUN, borderTop: `0.5px solid #F0F0F0`, paddingTop: 8, marginTop: 4 }}>
                      <span>Reste à payer</span>
                      <span>{reste.toFixed(2)} TND</span>
                    </div>
                  </div>

                  {!toutRegle && (
                    <div style={{ padding: '12px 16px', borderBottom: `0.5px solid #F0F0F0` }}>
                      <div style={{ fontSize: 11, color: '#666', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Enregistrer un paiement</div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <input
                          type="number"
                          placeholder={`${reste.toFixed(2)}`}
                          value={tablePopup === table ? montantPaiement : ''}
                          onFocus={() => setTablePopup(table)}
                          onChange={e => setMontantPaiement(e.target.value)}
                          style={{ flex: 1, padding: '7px 10px', borderRadius: 6, border: `0.5px solid #DDD`, fontSize: 13, outline: 'none' }}
                        />
                        <select
                          value={tablePopup === table ? modePaiement : 'especes'}
                          onFocus={() => setTablePopup(table)}
                          onChange={e => setModePaiement(e.target.value)}
                          style={{ padding: '7px 10px', borderRadius: 6, border: `0.5px solid #DDD`, fontSize: 12, background: '#FFF' }}>
                          <option value="especes">Espèces</option>
                          <option value="carte">Carte</option>
                        </select>
                        <button
                          onClick={() => {
                            const montant = parseFloat(montantPaiement) || reste;
                            ajouterPaiement(table, montant, modePaiement);
                            setMontantPaiement('');
                            setTablePopup(null);
                          }}
                          style={{ padding: '7px 14px', borderRadius: 6, border: 'none', background: '#1a1a1a', color: '#FFF', cursor: 'pointer', fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap' }}>
                          Payer
                        </button>
                      </div>
                    </div>
                  )}

                  <div style={{ padding: '12px 16px' }}>
                    <button
                      onClick={() => cloturerTable(table)}
                      disabled={!toutRegle}
                      style={{ width: '100%', padding: '10px', borderRadius: 8, border: 'none', background: toutRegle ? BRUN : '#E0E0E0', color: toutRegle ? CREME : '#999', cursor: toutRegle ? 'pointer' : 'not-allowed', fontSize: 13, fontWeight: 500 }}>
                      {toutRegle ? 'Clôturer la table ✓' : 'Régler d\'abord le solde'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {vue === 'historique' && (
        <div style={{ padding: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: '#1a1a1a', marginBottom: 4 }}>Historique des additions</h2>
          <p style={{ fontSize: 13, color: '#888', marginBottom: 20 }}>Tables clôturées — clients partis et payés</p>
          {historique.length === 0 && <div style={{ textAlign: 'center', marginTop: 60, color: '#999' }}>Aucun historique</div>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {historique.map(h => (
              <div key={h.id} style={{ background: '#FFF', borderRadius: 10, overflow: 'hidden', border: `0.5px solid ${BORDER}` }}>
                <div style={{ padding: '10px 16px', borderBottom: `0.5px solid #F0F0F0`, display: 'flex', justifyContent: 'space-between', background: '#F9F9F9' }}>
                  <span style={{ fontWeight: 600 }}>Table {h.table}</span>
                  <span style={{ fontSize: 12, color: '#999' }}>{h.date} — {formatHeure(h.heureCloture)}</span>
                </div>
                <div style={{ padding: '10px 16px', borderBottom: `0.5px solid #F0F0F0` }}>
                  {(h.commandes || []).map((cmd, j) => (
                    <div key={j}>
                      {cmd.produits?.map((p, k) => (
                        <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#333', padding: '2px 0' }}>
                          <span>{p.quantite}× {p.nom}</span>
                          <span style={{ color: '#999' }}>{(p.prix * p.quantite).toFixed(2)} TND</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
                {(h.paiements || []).length > 0 && (
                  <div style={{ padding: '8px 16px', borderBottom: `0.5px solid #F0F0F0`, background: '#F9F9F9' }}>
                    {h.paiements.map((p, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#555', padding: '2px 0' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ background: p.mode === 'carte' ? '#DBEAFE' : '#DCFCE7', color: p.mode === 'carte' ? '#1E40AF' : '#166534', padding: '1px 8px', borderRadius: 10, fontSize: 10 }}>
                            {p.mode === 'carte' ? 'Carte' : 'Espèces'}
                          </span>
                        </span>
                        <span>{p.montant.toFixed(2)} TND</span>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ padding: '10px 16px', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 700, fontSize: 15, color: BRUN }}>Total payé : {h.total?.toFixed(2)} TND</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {vue === 'stocks' && (
        <div style={{ padding: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: '#1a1a1a', marginBottom: 4 }}>Stocks journaliers</h2>
          <p style={{ fontSize: 13, color: '#888', marginBottom: 20 }}>Définissez les quantités disponibles aujourd'hui.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {CATALOGUE.map(produit => {
              const stock = stocks[produit.id] || { actif: false, stock: 10 };
              return (
                <div key={produit.id} style={{ background: '#FFF', borderRadius: 10, padding: '14px 18px', border: `0.5px solid ${BORDER}`, display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: '#1a1a1a' }}>{produit.nom}</div>
                    <div style={{ fontSize: 12, color: '#999', marginTop: 2 }}>{produit.categorie} — {produit.prix.toFixed(2)} TND</div>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#666', cursor: 'pointer' }}>
                    <input type="checkbox" checked={stock.actif}
                      onChange={e => setStocks(s => ({ ...s, [produit.id]: { ...s[produit.id] || { stock: 10 }, actif: e.target.checked } }))} />
                    Stock limité
                  </label>
                  {stock.actif && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <button onClick={() => setStocks(s => ({ ...s, [produit.id]: { ...s[produit.id], stock: Math.max(0, (s[produit.id]?.stock || 0) - 1) } }))}
                        style={{ width: 28, height: 28, borderRadius: '50%', border: `0.5px solid #DDD`, background: '#F5F5F5', color: '#333', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                      <span style={{ fontSize: 16, fontWeight: 700, color: stock.stock === 0 ? '#EF4444' : '#1a1a1a', minWidth: 28, textAlign: 'center' }}>{stock.stock}</span>
                      <button onClick={() => setStocks(s => ({ ...s, [produit.id]: { ...s[produit.id], stock: (s[produit.id]?.stock || 0) + 1 } }))}
                        style={{ width: 28, height: 28, borderRadius: '50%', border: 'none', background: '#1a1a1a', color: '#FFF', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                      {stock.stock === 0 && <span style={{ fontSize: 11, color: '#EF4444', fontWeight: 600 }}>ÉPUISÉ</span>}
                    </div>
                  )}
                  {!stock.actif && <span style={{ fontSize: 12, color: '#999', fontStyle: 'italic' }}>Illimité</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {vue === 'stats' && (
        <div style={{ padding: 24 }}>
          {!statsDebloquees ? (
            <div style={{ maxWidth: 360, margin: '60px auto', textAlign: 'center' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 24 }}>🔒</div>
              <h2 style={{ fontSize: 16, fontWeight: 600, color: '#1a1a1a', marginBottom: 8 }}>Accès réservé</h2>
              <p style={{ fontSize: 13, color: '#888', marginBottom: 20 }}>Entrez le mot de passe pour accéder aux statistiques</p>
              <input type="password" value={mdpStats} onChange={e => setMdpStats(e.target.value)} onKeyDown={e => e.key === 'Enter' && (() => { if (mdpStats === MDP_STATS) { setStatsDebloquees(true); setMdpErreur(false); } else setMdpErreur(true); })()}
                placeholder="Mot de passe" style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: `1px solid ${mdpErreur ? '#EF4444' : '#DDD'}`, fontSize: 14, marginBottom: 8, boxSizing: 'border-box' }} />
              {mdpErreur && <p style={{ color: '#EF4444', fontSize: 12, marginBottom: 8 }}>Mot de passe incorrect</p>}
              <button onClick={() => { if (mdpStats === MDP_STATS) { setStatsDebloquees(true); setMdpErreur(false); } else setMdpErreur(true); }}
                style={{ width: '100%', padding: '12px', borderRadius: 8, border: 'none', background: '#1a1a1a', color: '#FFF', cursor: 'pointer', fontSize: 14 }}>
                Accéder aux statistiques
              </button>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h2 style={{ fontSize: 16, fontWeight: 600, color: '#1a1a1a', margin: 0 }}>Statistiques — {today}</h2>
                <button onClick={() => setStatsDebloquees(false)} style={{ padding: '6px 12px', borderRadius: 6, border: `0.5px solid #DDD`, background: CREME, color: '#666', cursor: 'pointer', fontSize: 12 }}>Verrouiller</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
                {[
                  { label: 'Total du jour', value: `${totalJour.toFixed(2)} TND`, color: BRUN },
                  { label: 'Ticket moyen', value: `${ticketMoyen.toFixed(2)} TND`, color: '#1E40AF' },
                  { label: 'Tables servies', value: histoAujourdhui.length, color: '#166534' },
                ].map((s, i) => (
                  <div key={i} style={{ background: '#FFF', borderRadius: 8, padding: '16px', border: `0.5px solid ${BORDER}` }}>
                    <div style={{ fontSize: 11, color: '#666', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>{s.label}</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div style={{ background: '#FFF', borderRadius: 10, padding: 16, border: `0.5px solid ${BORDER}` }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a', marginBottom: 12 }}>Produits les plus vendus</div>
                  {produitsPlusVendus().length === 0 ? <p style={{ color: '#999', fontSize: 13 }}>Aucune donnée</p> :
                    produitsPlusVendus().map(([nom, qte], i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `0.5px solid #F0F0F0`, fontSize: 13 }}>
                        <span>{i + 1}. {nom}</span>
                        <span style={{ fontWeight: 600, color: BRUN }}>{qte}×</span>
                      </div>
                    ))}
                </div>
                <div style={{ background: '#FFF', borderRadius: 10, padding: 16, border: `0.5px solid ${BORDER}` }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a', marginBottom: 12 }}>Table la plus rentable</div>
                  {tablePlusRentable() ? (
                    <div style={{ textAlign: 'center', paddingTop: 20 }}>
                      <div style={{ fontSize: 36, fontWeight: 700, color: BRUN }}>Table {tablePlusRentable()[0]}</div>
                      <div style={{ fontSize: 20, color: '#666', marginTop: 4 }}>{tablePlusRentable()[1].toFixed(2)} TND</div>
                    </div>
                  ) : <p style={{ color: '#999', fontSize: 13 }}>Aucune donnée</p>}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {commandeSelectee && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#FFF', borderRadius: 12, padding: 24, width: 500, maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1a1a1a', margin: 0 }}>Modifier — Table {commandeSelectee.table}</h3>
              <button onClick={() => setCommandeSelectee(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#999' }}>✕</button>
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, color: '#666', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Articles en cours</div>
              {(commandeSelecteeLive?.produits || []).map((p, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: `0.5px solid #F0F0F0` }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, color: '#1a1a1a' }}>{p.nom}</div>
                    {p.ajouteParServeur && <div style={{ fontSize: 10, color: '#8B7355', fontStyle: 'italic' }}>Ajouté par le serveur</div>}
                  </div>
                  <span style={{ fontSize: 13, color: '#999', minWidth: 70, textAlign: 'right' }}>{(p.prix * p.quantite).toFixed(2)} TND</span>
                  <button onClick={() => diminuerArticle(commandeSelectee, i)}
                    style={{ width: 26, height: 26, borderRadius: '50%', border: `0.5px solid #DDD`, background: '#F5F5F5', color: '#333', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                  <span style={{ fontWeight: 600, minWidth: 16, textAlign: 'center' }}>{p.quantite}</span>
                  <button onClick={() => ajouterArticle(commandeSelectee, p, false)}
                    style={{ width: 26, height: 26, borderRadius: '50%', border: 'none', background: '#1a1a1a', color: '#FFF', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                  <button onClick={() => supprimerArticle(commandeSelectee, i)}
                    style={{ background: 'none', border: 'none', color: '#EF4444', fontSize: 16, cursor: 'pointer', padding: '0 4px' }}>✕</button>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0 0', fontWeight: 700, fontSize: 15, color: BRUN }}>
                <span>Total</span>
                <span>{(commandeSelecteeLive?.total || 0).toFixed(2)} TND</span>
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, color: '#666', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Ajouter un article (serveur)</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                {CATALOGUE.map(produit => (
                  <button key={produit.id} onClick={() => ajouterArticle(commandeSelectee, produit, true)}
                    style={{ padding: '8px 12px', borderRadius: 8, border: `0.5px solid #DDD`, background: '#F8F8F8', color: '#1a1a1a', cursor: 'pointer', fontSize: 12, textAlign: 'left' }}>
                    <div style={{ fontWeight: 500 }}>{produit.nom}</div>
                    <div style={{ color: '#999', marginTop: 2 }}>{produit.prix.toFixed(2)} TND</div>
                  </button>
                ))}
              </div>
            </div>

            <button onClick={() => { setCommandeSelectee(null); setModifie(false); }}
              style={{ width: '100%', padding: '12px', borderRadius: 8, border: 'none', background: modifie ? '#166534' : '#1a1a1a', color: '#FFF', cursor: 'pointer', fontSize: 14, fontWeight: 500 }}>
              {modifie ? '✓ Modifications enregistrées' : 'Fermer'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;