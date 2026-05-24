import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, onSnapshot, doc, updateDoc, addDoc, serverTimestamp, deleteDoc, setDoc } from 'firebase/firestore';
import * as XLSX from 'xlsx';

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

const SUPPLEMENTS = [
  { id: 's1', produitId: 8, nom: "Saumon fumé", prix: 3.0 },
  { id: 's2', produitId: 8, nom: "Burrata", prix: 4.0 },
  { id: 's3', produitId: 8, nom: "Avocat supplémentaire", prix: 2.5 },
  { id: 's4', produitId: 8, nom: "Œuf supplémentaire", prix: 1.5 },
  { id: 's5', produitId: 9, nom: "Fromage", prix: 1.5 },
  { id: 's6', produitId: 9, nom: "Double thon", prix: 2.0 },
  { id: 's7', produitId: 9, nom: "Frites", prix: 3.0 },
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
  const [sousVueCommandes, setSousVueCommandes] = useState('en_attente');
  const [commandeSelectee, setCommandeSelectee] = useState(null);
  const [commandeSelecteeLive, setCommandeSelecteeLive] = useState(null);
  const [stocks, setStocks] = useState({});
  const [stocksSupplements, setStocksSupplements] = useState({});
  const [mdpStats, setMdpStats] = useState('');
  const [statsDebloquees, setStatsDebloquees] = useState(false);
  const [mdpErreur, setMdpErreur] = useState(false);
  const [modifie, setModifie] = useState(false);
  const [paiementsTable, setPaiementsTable] = useState({});
  const [articleActif, setArticleActif] = useState(null); // { table, cmdId, idx, montantMax }
  const [montantArticle, setMontantArticle] = useState('');
  const [additionModifTable, setAdditionModifTable] = useState(null);
  const [moisOuvert, setMoisOuvert] = useState(null);
  const [jourOuvert, setJourOuvert] = useState(null);

  useEffect(() => {
    const unsub1 = onSnapshot(collection(db, 'commandes'), (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .filter(c => c.statut !== 'termine')
        .sort((a, b) => (b.heure?.seconds || 0) - (a.heure?.seconds || 0));
      setCommandes(data);
      if (commandeSelectee) {
        const updated = data.find(c => c.id === commandeSelectee.id);
        if (updated) setCommandeSelecteeLive(updated);
      }
    });
    const unsub2 = onSnapshot(collection(db, 'historique'), (snap) => {
      setHistorique(snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.heureCloture?.seconds || 0) - (a.heureCloture?.seconds || 0)));
    });
    return () => { unsub1(); unsub2(); };
  }, [commandeSelectee]);

  useEffect(() => {
    const unsubStocks = onSnapshot(doc(db, 'stocks', 'produits'), (snap) => { if (snap.exists()) setStocks(snap.data()); });
    const unsubSupplements = onSnapshot(doc(db, 'stocks', 'supplements'), (snap) => { if (snap.exists()) setStocksSupplements(snap.data()); });
    return () => { unsubStocks(); unsubSupplements(); };
  }, []);

  const ouvrirModifier = (commande) => {
    setCommandeSelectee(commande);
    setCommandeSelecteeLive(commande);
    setModifie(false);
  };

  const changerStatut = async (id, statut) => {
    await updateDoc(doc(db, 'commandes', id), { statut });
  };

  const supprimerCommande = async (commande) => {
    setCorbeille(c => [{ ...commande, supprimeLe: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) }, ...c.slice(0, 9)]);
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
    if (parServeur) {
      produits.push({ ...produit, quantite: 1, ajouteParServeur: true });
    } else {
      const existe = produits.find(p => p.id === produit.id);
      if (existe) existe.quantite += 1;
      else produits.push({ ...produit, quantite: 1 });
    }
    const total = produits.reduce((acc, p) => acc + p.prix * p.quantite, 0);
    await updateDoc(doc(db, 'commandes', commande.id), { produits, total });
    setModifie(true);
  };

  const diminuerArticle = async (commande, idx) => {
    const live = commandeSelecteeLive || commande;
    const produits = [...(live.produits || [])];
    if (produits[idx].quantite <= 1) produits.splice(idx, 1);
    else produits[idx] = { ...produits[idx], quantite: produits[idx].quantite - 1 };
    const total = produits.reduce((acc, p) => acc + p.prix * p.quantite, 0);
    await updateDoc(doc(db, 'commandes', commande.id), { produits, total });
    setModifie(true);
  };

  const supprimerArticle = async (commande, idx) => {
    const live = commandeSelecteeLive || commande;
    const produits = (live.produits || []).filter((_, i) => i !== idx);
    const total = produits.reduce((acc, p) => acc + p.prix * p.quantite, 0);
    await updateDoc(doc(db, 'commandes', commande.id), { produits, total });
    setModifie(true);
  };

  const ajouterArticleAddition = async (table, produit) => {
    const cmdsTable = commandes.filter(c => c.table === table);
    if (cmdsTable.length === 0) return;
    const derniereCmd = cmdsTable[cmdsTable.length - 1];
    const produits = [...(derniereCmd.produits || []), { ...produit, quantite: 1, ajouteParServeur: true }];
    const total = produits.reduce((acc, p) => acc + p.prix * p.quantite, 0);
    await updateDoc(doc(db, 'commandes', derniereCmd.id), { produits, total });
  };

  const supprimerArticleAddition = async (cmdId, idx) => {
    const cmd = commandes.find(c => c.id === cmdId);
    if (!cmd) return;
    const produits = cmd.produits.filter((_, i) => i !== idx);
    const total = produits.reduce((acc, p) => acc + p.prix * p.quantite, 0);
    await updateDoc(doc(db, 'commandes', cmdId), { produits, total });
  };

  // Paiement partiel d'un article
  const payerArticle = (table, cmdId, idx, montant, mode) => {
    const montantReel = parseFloat(montant);
    if (!montantReel || montantReel <= 0) return;
    const key = `${cmdId}-${idx}`;
    setPaiementsTable(prev => ({
      ...prev,
      [table]: [...(prev[table] || []), {
        montant: montantReel,
        mode,
        heure: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        articleKey: key,
        label: commandes.find(c => c.id === cmdId)?.produits?.[idx]?.nom || ''
      }]
    }));
    setArticleActif(null);
    setMontantArticle('');
  };

  // Tout payer d'un coup
  const payerTout = (table, mode) => {
    const reste = resteAPayer(table);
    if (reste <= 0) return;
    setPaiementsTable(prev => ({
      ...prev,
      [table]: [...(prev[table] || []), {
        montant: reste,
        mode,
        heure: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        label: 'Total'
      }]
    }));
  };

  const montantDejaPayeArticle = (table, cmdId, idx) => {
    const key = `${cmdId}-${idx}`;
    return (paiementsTable[table] || [])
      .filter(p => p.articleKey === key)
      .reduce((acc, p) => acc + p.montant, 0);
  };

  const cloturerTable = async (table) => {
    const cmdsTable = commandes.filter(c => c.table === table);
    const total = cmdsTable.reduce((acc, c) => acc + (c.total || 0), 0);
    const paiements = paiementsTable[table] || [];
    const now = new Date();
    await addDoc(collection(db, 'historique'), {
      table, commandes: cmdsTable, total, paiements,
      heureCloture: serverTimestamp(),
      date: now.toLocaleDateString('fr-FR'),
      mois: `${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`,
      annee: now.getFullYear(),
    });
    for (const cmd of cmdsTable) {
      await updateDoc(doc(db, 'commandes', cmd.id), { statut: 'termine' });
    }
    setPaiementsTable(p => { const n = { ...p }; delete n[table]; return n; });
    setAdditionModifTable(null);
    setArticleActif(null);
  };

  const tables = [...new Set(commandes.map(c => c.table))].sort((a, b) => a - b);
  const commandesParTable = (table) => commandes.filter(c => c.table === table);
  const totalTable = (table) => commandesParTable(table).reduce((acc, c) => acc + (c.total || 0), 0);
  const totalPaye = (table) => (paiementsTable[table] || []).reduce((acc, p) => acc + p.montant, 0);
  const resteAPayer = (table) => Math.max(0, totalTable(table) - totalPaye(table));

  const commandesEnAttente = commandes.filter(c => c.statut === 'en_attente');
  const commandesEnPrep = commandes.filter(c => c.statut === 'en_preparation');
  const commandesServies = commandes.filter(c => c.statut === 'pret');
  const nbAttente = commandesEnAttente.length;
  const nbPrep = commandesEnPrep.length;
  const nbServi = commandesServies.length;

  const statutColor = (s) => s === 'en_attente' ? '#92400E' : s === 'en_preparation' ? '#1E40AF' : '#166534';
  const statutBg = (s) => s === 'en_attente' ? '#FEF3C7' : s === 'en_preparation' ? '#DBEAFE' : '#DCFCE7';
  const statutLabel = (s) => s === 'en_attente' ? 'En attente' : s === 'en_preparation' ? 'En préparation' : 'Servi';
  const formatHeure = (h) => !h ? '' : new Date(h.seconds * 1000).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  const today = new Date().toLocaleDateString('fr-FR');
  const histoAujourdhui = historique.filter(h => h.date === today);
  const totalJour = histoAujourdhui.reduce((acc, h) => acc + (h.total || 0), 0);
  const ticketMoyen = histoAujourdhui.length > 0 ? totalJour / histoAujourdhui.length : 0;
  const moisDisponibles = [...new Set(historique.map(h => h.mois).filter(Boolean))].sort().reverse();
  const joursParMois = (mois) => [...new Set(historique.filter(h => h.mois === mois).map(h => h.date).filter(Boolean))].sort().reverse();

  const statsParJour = (jour) => {
    const histoJour = historique.filter(h => h.date === jour);
    const total = histoJour.reduce((acc, h) => acc + (h.total || 0), 0);
    const ticket = histoJour.length > 0 ? total / histoJour.length : 0;
    const map = {};
    histoJour.forEach(h => {
      (h.commandes || []).forEach(cmd => {
        (cmd.produits || []).forEach(p => {
          if (!map[p.nom]) map[p.nom] = 0;
          map[p.nom] += p.quantite;
        });
      });
    });
    return { total, ticket, tables: histoJour.length, top: Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5) };
  };

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

  const exporterExcel = (mois) => {
    const histoMois = historique.filter(h => h.mois === mois);
    const rows = [];
    histoMois.forEach(h => {
      const date = h.date;
      const heure = h.heureCloture ? new Date(h.heureCloture.seconds * 1000).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '';
      (h.commandes || []).forEach(cmd => {
        (cmd.produits || []).forEach(p => {
          rows.push({ Date: date, Heure: heure, Table: `Table ${h.table}`, Produit: p.nom, Suppléments: (p.supplementsChoisis || []).join(', '), Sans: (p.ingredientsRetires || []).join(', '), Quantité: p.quantite, 'Prix unitaire': p.prix, Total: p.prix * p.quantite });
        });
      });
      (h.paiements || []).forEach(p => {
        rows.push({ Date: date, Heure: heure, Table: `Table ${h.table}`, Produit: `PAIEMENT - ${p.label || ''} (${p.mode})`, Suppléments: '', Sans: '', Quantité: 1, 'Prix unitaire': p.montant, Total: p.montant });
      });
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, mois);
    XLSX.writeFile(wb, `QResto_${mois}.xlsx`);
  };

  const CommandeCard = ({ commande }) => (
    <div style={{ background: '#FFF', borderRadius: 10, overflow: 'hidden', border: `0.5px solid ${BORDER}`, borderTop: `3px solid ${statutColor(commande.statut)}` }}>
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
          <div key={i} style={{ padding: '4px 0', fontSize: 13 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#333' }}>
              <span style={{ fontWeight: 500 }}>{p.quantite}× {p.nom}</span>
              <span style={{ color: '#999' }}>{(p.prix * p.quantite).toFixed(2)} TND</span>
            </div>
            {p.ingredientsRetires?.length > 0 && <div style={{ fontSize: 10, color: '#EF4444', marginLeft: 8 }}>✕ Sans : {Array.isArray(p.ingredientsRetires) ? p.ingredientsRetires.join(', ') : p.ingredientsRetires}</div>}
            {p.supplementsChoisis?.length > 0 && <div style={{ fontSize: 10, color: '#166534', marginLeft: 8 }}>+ {Array.isArray(p.supplementsChoisis) ? p.supplementsChoisis.join(', ') : p.supplementsChoisis}</div>}
            {p.ajouteParServeur && <div style={{ fontSize: 10, color: '#8B7355', fontStyle: 'italic', marginLeft: 8 }}>— Ajouté par le serveur</div>}
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
              En préparation →
            </button>
          )}
          {commande.statut === 'en_preparation' && (
            <button onClick={() => changerStatut(commande.id, 'pret')}
              style={{ padding: '6px 12px', borderRadius: 6, border: 'none', background: '#DCFCE7', color: '#166534', cursor: 'pointer', fontSize: 12, fontWeight: 500 }}>
              Servi ✓
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: CREME2, fontFamily: 'sans-serif' }}>

      {/* HEADER */}
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
            { key: 'suppressions', label: `Suppressions${corbeille.length > 0 ? ` (${corbeille.length})` : ''}` },
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

      {/* COMMANDES — 3 sous-onglets */}
      {vue === 'commandes' && (
        <>
          <div style={{ display: 'flex', background: CREME, borderBottom: `0.5px solid ${BORDER}`, padding: '0 24px' }}>
            {[
              { key: 'en_attente', label: 'En attente', count: nbAttente, color: '#92400E', bg: '#FEF3C7' },
              { key: 'en_preparation', label: 'En préparation', count: nbPrep, color: '#1E40AF', bg: '#DBEAFE' },
              { key: 'pret', label: 'Servies', count: nbServi, color: '#166534', bg: '#DCFCE7' },
            ].map(s => (
              <button key={s.key} onClick={() => setSousVueCommandes(s.key)}
                style={{ padding: '12px 20px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, color: sousVueCommandes === s.key ? '#1a1a1a' : '#888', fontWeight: sousVueCommandes === s.key ? 700 : 400, borderBottom: sousVueCommandes === s.key ? `2px solid #1a1a1a` : '2px solid transparent', display: 'flex', alignItems: 'center', gap: 8 }}>
                {s.label}
                {s.count > 0 && <span style={{ background: s.bg, color: s.color, padding: '1px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{s.count}</span>}
              </button>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14, padding: '16px 24px 24px' }}>
            {sousVueCommandes === 'en_attente' && (commandesEnAttente.length === 0 ? <div style={{ textAlign: 'center', marginTop: 60, color: '#999', gridColumn: '1/-1' }}>Aucune commande en attente</div> : commandesEnAttente.map(c => <CommandeCard key={c.id} commande={c} />))}
            {sousVueCommandes === 'en_preparation' && (commandesEnPrep.length === 0 ? <div style={{ textAlign: 'center', marginTop: 60, color: '#999', gridColumn: '1/-1' }}>Aucune commande en préparation</div> : commandesEnPrep.map(c => <CommandeCard key={c.id} commande={c} />))}
            {sousVueCommandes === 'pret' && (commandesServies.length === 0 ? <div style={{ textAlign: 'center', marginTop: 60, color: '#999', gridColumn: '1/-1' }}>Aucune commande servie</div> : commandesServies.map(c => <CommandeCard key={c.id} commande={c} />))}
          </div>
        </>
      )}

      {/* SUPPRESSIONS */}
      {vue === 'suppressions' && (
        <div style={{ padding: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: '#1a1a1a', marginBottom: 4 }}>Commandes supprimées</h2>
          <p style={{ fontSize: 13, color: '#888', marginBottom: 20 }}>Les 10 dernières suppressions.</p>
          {corbeille.length === 0 ? <div style={{ textAlign: 'center', marginTop: 60, color: '#999' }}>Aucune suppression récente</div> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {corbeille.map((cmd, i) => (
                <div key={i} style={{ background: '#FFF', borderRadius: 10, overflow: 'hidden', border: `0.5px solid ${BORDER}` }}>
                  <div style={{ padding: '10px 16px', borderBottom: `0.5px solid #F0F0F0`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FFF8F8' }}>
                    <div><span style={{ fontWeight: 600 }}>Table {cmd.table}</span><span style={{ fontSize: 12, color: '#999', marginLeft: 8 }}>Supprimée à {cmd.supprimeLe}</span></div>
                    <button onClick={() => restaurerCommande(cmd)} style={{ padding: '6px 12px', borderRadius: 6, border: `0.5px solid #C8B400`, background: '#FFFDE7', color: '#7B6000', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <RestoreIcon /> Restaurer
                    </button>
                  </div>
                  <div style={{ padding: '10px 16px', borderBottom: `0.5px solid #F0F0F0` }}>
                    {cmd.produits?.map((p, j) => (
                      <div key={j} style={{ fontSize: 13, color: '#333', padding: '3px 0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>{p.quantite}× {p.nom}</span><span style={{ color: '#999' }}>{(p.prix * p.quantite).toFixed(2)} TND</span></div>
                        {p.ingredientsRetires?.length > 0 && <div style={{ fontSize: 10, color: '#EF4444' }}>Sans : {p.ingredientsRetires.join(', ')}</div>}
                        {p.supplementsChoisis?.length > 0 && <div style={{ fontSize: 10, color: '#166534' }}>+ {p.supplementsChoisis.join(', ')}</div>}
                      </div>
                    ))}
                  </div>
                  <div style={{ padding: '10px 16px' }}><span style={{ fontWeight: 700, fontSize: 14, color: BRUN }}>{cmd.total?.toFixed(2)} TND</span></div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ADDITIONS */}
      {vue === 'additions' && (
        <div style={{ padding: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: '#1a1a1a', marginBottom: 4 }}>Additions par table</h2>
          <p style={{ fontSize: 13, color: '#888', marginBottom: 20 }}>Cliquez sur un article pour le payer — partiellement ou en entier.</p>
          {tables.length === 0 && <div style={{ textAlign: 'center', marginTop: 60, color: '#999' }}>Aucune table active</div>}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 16 }}>
            {tables.map(table => {
              const cmds = commandesParTable(table);
              const total = totalTable(table);
              const paiements = paiementsTable[table] || [];
              const paye = totalPaye(table);
              const reste = resteAPayer(table);
              const toutRegle = reste === 0 && paiements.length > 0;
              const enModif = additionModifTable === table;

              return (
                <div key={table} style={{ background: '#FFF', borderRadius: 10, overflow: 'hidden', border: `0.5px solid ${BORDER}`, borderTop: `3px solid ${toutRegle ? '#166534' : BRUN}` }}>

                  {/* Header table */}
                  <div style={{ padding: '12px 16px', borderBottom: `0.5px solid #F0F0F0`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 16, fontWeight: 700 }}>Table {table}</span>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ fontSize: 12, color: toutRegle ? '#166534' : '#92400E', fontWeight: 600 }}>{toutRegle ? '✓ Tout réglé' : 'En cours'}</span>
                      <button onClick={() => setAdditionModifTable(enModif ? null : table)}
                        style={{ padding: '4px 10px', borderRadius: 6, border: `0.5px solid ${enModif ? BRUN : '#DDD'}`, background: enModif ? BRUN : '#F8F8F8', color: enModif ? CREME : '#666', cursor: 'pointer', fontSize: 11 }}>
                        {enModif ? 'Terminer' : 'Modifier'}
                      </button>
                    </div>
                  </div>

                  {/* Boutons payer tout */}
                  {!toutRegle && !enModif && (
                    <div style={{ padding: '10px 16px', borderBottom: `0.5px solid #F0F0F0`, background: '#F9F9F9', display: 'flex', gap: 8 }}>
                      <button onClick={() => payerTout(table, 'especes')}
                        style={{ flex: 1, padding: '8px', borderRadius: 8, border: 'none', background: '#166534', color: '#FFF', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                        Tout payer — Espèces ({reste.toFixed(2)} TND)
                      </button>
                      <button onClick={() => payerTout(table, 'carte')}
                        style={{ flex: 1, padding: '8px', borderRadius: 8, border: 'none', background: '#1E40AF', color: '#FFF', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                        Tout payer — Carte
                      </button>
                    </div>
                  )}

                  {/* Articles */}
                  <div style={{ padding: '10px 16px', borderBottom: `0.5px solid #F0F0F0` }}>
                    {!enModif && <div style={{ fontSize: 11, color: '#666', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Cliquez un article pour payer</div>}
                    {enModif && <div style={{ fontSize: 11, color: BRUN, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Mode modification</div>}

                    {cmds.map((cmd, i) => (
                      <div key={cmd.id} style={{ marginBottom: i < cmds.length - 1 ? 8 : 0 }}>
                        <div style={{ fontSize: 11, color: '#999', marginBottom: 3 }}>Commande {i + 1} — {formatHeure(cmd.heure)}</div>
                        {cmd.produits?.map((p, j) => {
                          const dejaPayePourCetArticle = montantDejaPayeArticle(table, cmd.id, j);
                          const prixArticle = p.prix * p.quantite;
                          const resteArticle = Math.max(0, prixArticle - dejaPayePourCetArticle);
                          const estActif = articleActif?.cmdId === cmd.id && articleActif?.idx === j;
                          const estPayeTotal = dejaPayePourCetArticle >= prixArticle;

                          return (
                            <div key={j} style={{ marginBottom: 4 }}>
                              <div
                                onClick={() => {
                                  if (enModif) return;
                                  if (estActif) { setArticleActif(null); setMontantArticle(''); return; }
                                  setArticleActif({ table, cmdId: cmd.id, idx: j, montantMax: resteArticle });
                                  setMontantArticle(resteArticle.toFixed(2));
                                }}
                                style={{
                                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13,
                                  padding: '7px 10px', borderRadius: 6, cursor: enModif ? 'default' : 'pointer',
                                  background: estPayeTotal ? '#F0FFF4' : estActif ? '#EBF5FB' : '#F9F9F9',
                                  border: `0.5px solid ${estPayeTotal ? '#166534' : estActif ? '#1E40AF' : '#E5E5E5'}`,
                                }}>
                                <span style={{ flex: 1, color: estPayeTotal ? '#166534' : '#333' }}>
                                  {p.quantite}× {p.nom}
                                  {p.supplementsChoisis?.length > 0 && <span style={{ fontSize: 10, color: '#166534', marginLeft: 4 }}>+{Array.isArray(p.supplementsChoisis) ? p.supplementsChoisis.join(', ') : p.supplementsChoisis}</span>}
                                </span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  {dejaPayePourCetArticle > 0 && !estPayeTotal && (
                                    <span style={{ fontSize: 10, color: '#166534', background: '#DCFCE7', padding: '1px 6px', borderRadius: 10 }}>−{dejaPayePourCetArticle.toFixed(2)}</span>
                                  )}
                                  <span style={{ color: estPayeTotal ? '#166534' : '#333', fontWeight: estPayeTotal ? 600 : 400 }}>
                                    {estPayeTotal ? '✓ Payé' : `${resteArticle.toFixed(2)} TND`}
                                  </span>
                                  {enModif && (
                                    <button onClick={(e) => { e.stopPropagation(); supprimerArticleAddition(cmd.id, j); }}
                                      style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', fontSize: 16, padding: '0 2px', marginLeft: 4 }}>✕</button>
                                  )}
                                </div>
                              </div>

                              {/* Mini panneau paiement article */}
                              {estActif && !enModif && (
                                <div style={{ background: '#EBF5FB', borderRadius: '0 0 8px 8px', padding: '10px 12px', border: `0.5px solid #1E40AF`, borderTop: 'none', marginTop: -2 }}>
                                  <div style={{ fontSize: 11, color: '#1E40AF', marginBottom: 8, fontWeight: 600 }}>Montant à encaisser pour "{p.nom}"</div>
                                  <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                                    <input
                                      value={montantArticle}
                                      onChange={e => setMontantArticle(e.target.value)}
                                      style={{ flex: 1, padding: '7px 10px', borderRadius: 6, border: `0.5px solid #1E40AF`, fontSize: 13, outline: 'none', MozAppearance: 'textfield' }}
                                      placeholder="Montant"
                                    />
                                    <button onClick={() => setMontantArticle((resteArticle / 2).toFixed(2))}
                                      style={{ padding: '7px 12px', borderRadius: 6, border: `0.5px solid #1E40AF`, background: '#FFF', color: '#1E40AF', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                                      50%
                                    </button>
                                    <button onClick={() => setMontantArticle(resteArticle.toFixed(2))}
                                      style={{ padding: '7px 12px', borderRadius: 6, border: `0.5px solid #1E40AF`, background: '#FFF', color: '#1E40AF', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                                      100%
                                    </button>
                                  </div>
                                  <div style={{ display: 'flex', gap: 6 }}>
                                    <button onClick={() => payerArticle(table, cmd.id, j, montantArticle, 'especes')}
                                      style={{ flex: 1, padding: '8px', borderRadius: 6, border: 'none', background: '#166534', color: '#FFF', cursor: 'pointer', fontSize: 12, fontWeight: 500 }}>
                                      Espèces
                                    </button>
                                    <button onClick={() => payerArticle(table, cmd.id, j, montantArticle, 'carte')}
                                      style={{ flex: 1, padding: '8px', borderRadius: 6, border: 'none', background: '#1E40AF', color: '#FFF', cursor: 'pointer', fontSize: 12, fontWeight: 500 }}>
                                      Carte
                                    </button>
                                    <button onClick={() => { setArticleActif(null); setMontantArticle(''); }}
                                      style={{ padding: '8px 12px', borderRadius: 6, border: `0.5px solid #DDD`, background: '#FFF', color: '#666', cursor: 'pointer', fontSize: 12 }}>
                                      ✕
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>

                  {/* Ajouter article en mode modif */}
                  {enModif && (
                    <div style={{ padding: '10px 16px', borderBottom: `0.5px solid #F0F0F0`, background: '#FFF8F0' }}>
                      <div style={{ fontSize: 11, color: '#666', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Ajouter un article</div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                        {CATALOGUE.map(produit => (
                          <button key={produit.id} onClick={() => ajouterArticleAddition(table, produit)}
                            style={{ padding: '6px 8px', borderRadius: 8, border: `0.5px solid #DDD`, background: '#FFF', color: '#1a1a1a', cursor: 'pointer', fontSize: 11, textAlign: 'left' }}>
                            <div style={{ fontWeight: 500 }}>{produit.nom}</div>
                            <div style={{ color: '#999', fontSize: 10 }}>{produit.prix.toFixed(2)} TND</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Paiements reçus */}
                  {paiements.length > 0 && (
                    <div style={{ padding: '10px 16px', borderBottom: `0.5px solid #F0F0F0`, background: '#F9F9F9' }}>
                      <div style={{ fontSize: 11, color: '#666', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Paiements reçus</div>
                      {paiements.map((p, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#333', padding: '3px 0' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ background: p.mode === 'carte' ? '#DBEAFE' : '#DCFCE7', color: p.mode === 'carte' ? '#1E40AF' : '#166534', padding: '1px 8px', borderRadius: 10, fontSize: 10, fontWeight: 600 }}>
                              {p.mode === 'carte' ? 'Carte' : 'Espèces'}
                            </span>
                            {p.label && <span style={{ color: '#999' }}>{p.label}</span>}
                            <span style={{ color: '#999' }}>{p.heure}</span>
                          </span>
                          <span style={{ fontWeight: 600, color: '#166534' }}>−{p.montant.toFixed(2)} TND</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Total / Reste */}
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 700, color: toutRegle ? '#166634' : BRUN, borderTop: `0.5px solid #F0F0F0`, paddingTop: 8, marginTop: 4 }}>
                      <span>Reste à payer</span>
                      <span>{reste.toFixed(2)} TND</span>
                    </div>
                  </div>

                  {/* Clôturer */}
                  <div style={{ padding: '12px 16px' }}>
                    <button onClick={() => cloturerTable(table)} disabled={!toutRegle}
                      style={{ width: '100%', padding: '10px', borderRadius: 8, border: 'none', background: toutRegle ? BRUN : '#E0E0E0', color: toutRegle ? CREME : '#999', cursor: toutRegle ? 'pointer' : 'not-allowed', fontSize: 13, fontWeight: 500 }}>
                      {toutRegle ? 'Clôturer la table ✓' : "Régler d'abord le solde"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* HISTORIQUE */}
      {vue === 'historique' && (
        <div style={{ padding: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: '#1a1a1a', marginBottom: 4 }}>Historique des additions</h2>
          <p style={{ fontSize: 13, color: '#888', marginBottom: 20 }}>Tables clôturées aujourd'hui</p>
          {historique.filter(h => h.date === today).length === 0 && <div style={{ textAlign: 'center', marginTop: 60, color: '#999' }}>Aucun historique aujourd'hui</div>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {historique.filter(h => h.date === today).map(h => (
              <div key={h.id} style={{ background: '#FFF', borderRadius: 10, overflow: 'hidden', border: `0.5px solid ${BORDER}` }}>
                <div style={{ padding: '10px 16px', borderBottom: `0.5px solid #F0F0F0`, display: 'flex', justifyContent: 'space-between', background: '#F9F9F9' }}>
                  <span style={{ fontWeight: 600 }}>Table {h.table}</span>
                  <span style={{ fontSize: 12, color: '#999' }}>{h.date} — {formatHeure(h.heureCloture)}</span>
                </div>
                <div style={{ padding: '10px 16px', borderBottom: `0.5px solid #F0F0F0` }}>
                  {[...(h.commandes || []).flatMap(cmd => cmd.produits || [])].reduce((acc, p) => {
                    const existe = acc.find(x => x.nom === p.nom);
                    if (existe) existe.quantite += p.quantite;
                    else acc.push({ ...p });
                    return acc;
                  }, []).map((p, k) => (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#333', padding: '2px 0' }}>
                      <span>{p.quantite}× {p.nom}</span>
                      <span style={{ color: '#999' }}>{(p.prix * p.quantite).toFixed(2)} TND</span>
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
                          {p.label && <span>{p.label}</span>}
                        </span>
                        <span>{p.montant.toFixed(2)} TND</span>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ padding: '10px 16px' }}>
                  <span style={{ fontWeight: 700, fontSize: 15, color: BRUN }}>Total payé : {h.total?.toFixed(2)} TND</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* STOCKS */}
      {vue === 'stocks' && (
        <div style={{ padding: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: '#1a1a1a', marginBottom: 4 }}>Stocks journaliers</h2>
          <p style={{ fontSize: 13, color: '#888', marginBottom: 20 }}>Gérez les stocks des produits et suppléments.</p>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a', marginBottom: 12 }}>Produits</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
            {CATALOGUE.map(produit => {
              const stock = stocks[produit.id] || { actif: false, stock: 10 };
              return (
                <div key={produit.id} style={{ background: '#FFF', borderRadius: 10, padding: '14px 18px', border: `0.5px solid ${BORDER}`, display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: '#1a1a1a' }}>{produit.nom}</div>
                    <div style={{ fontSize: 12, color: '#999', marginTop: 2 }}>{produit.categorie} — {produit.prix.toFixed(2)} TND</div>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#666', cursor: 'pointer' }}>
                    <input type="checkbox" checked={stock.actif} onChange={e => { const nouv = { ...stocks, [produit.id]: { ...(stocks[produit.id] || { stock: 10 }), actif: e.target.checked } }; setStocks(nouv); setDoc(doc(db, 'stocks', 'produits'), nouv); }} />
                    Limité
                  </label>
                  {stock.actif && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <button onClick={() => { const nouv = { ...stocks, [produit.id]: { ...stocks[produit.id], stock: Math.max(0, (stocks[produit.id]?.stock || 0) - 1) } }; setStocks(nouv); setDoc(doc(db, 'stocks', 'produits'), nouv); }} style={{ width: 28, height: 28, borderRadius: '50%', border: `0.5px solid #DDD`, background: '#F5F5F5', color: '#333', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                      <span style={{ fontSize: 16, fontWeight: 700, color: stock.stock === 0 ? '#EF4444' : '#1a1a1a', minWidth: 28, textAlign: 'center' }}>{stock.stock}</span>
                      <button onClick={() => { const nouv = { ...stocks, [produit.id]: { ...stocks[produit.id], stock: (stocks[produit.id]?.stock || 0) + 1 } }; setStocks(nouv); setDoc(doc(db, 'stocks', 'produits'), nouv); }} style={{ width: 28, height: 28, borderRadius: '50%', border: 'none', background: '#1a1a1a', color: '#FFF', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                      {stock.stock === 0 && <span style={{ fontSize: 11, color: '#EF4444', fontWeight: 600 }}>ÉPUISÉ</span>}
                    </div>
                  )}
                  {!stock.actif && <span style={{ fontSize: 12, color: '#999', fontStyle: 'italic' }}>Illimité</span>}
                </div>
              );
            })}
          </div>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a', marginBottom: 12 }}>Suppléments</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {SUPPLEMENTS.map(sup => {
              const produit = CATALOGUE.find(p => p.id === sup.produitId);
              const stock = stocksSupplements[sup.id] || { actif: false, stock: 10 };
              return (
                <div key={sup.id} style={{ background: '#FFF', borderRadius: 10, padding: '14px 18px', border: `0.5px solid ${BORDER}`, display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: '#1a1a1a' }}>{sup.nom}</div>
                    <div style={{ fontSize: 12, color: '#999', marginTop: 2 }}>Supplément {produit?.nom} — +{sup.prix.toFixed(2)} TND</div>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#666', cursor: 'pointer' }}>
                    <input type="checkbox" checked={stock.actif} onChange={e => { const nouv = { ...stocksSupplements, [sup.id]: { ...(stocksSupplements[sup.id] || { stock: 10 }), actif: e.target.checked } }; setStocksSupplements(nouv); setDoc(doc(db, 'stocks', 'supplements'), nouv); }} />
                    Limité
                  </label>
                  {stock.actif && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <button onClick={() => { const nouv = { ...stocksSupplements, [sup.id]: { ...stocksSupplements[sup.id], stock: Math.max(0, (stocksSupplements[sup.id]?.stock || 0) - 1) } }; setStocksSupplements(nouv); setDoc(doc(db, 'stocks', 'supplements'), nouv); }} style={{ width: 28, height: 28, borderRadius: '50%', border: `0.5px solid #DDD`, background: '#F5F5F5', color: '#333', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                      <span style={{ fontSize: 16, fontWeight: 700, color: stock.stock === 0 ? '#EF4444' : '#1a1a1a', minWidth: 28, textAlign: 'center' }}>{stock.stock}</span>
                      <button onClick={() => { const nouv = { ...stocksSupplements, [sup.id]: { ...stocksSupplements[sup.id], stock: (stocksSupplements[sup.id]?.stock || 0) + 1 } }; setStocksSupplements(nouv); setDoc(doc(db, 'stocks', 'supplements'), nouv); }} style={{ width: 28, height: 28, borderRadius: '50%', border: 'none', background: '#1a1a1a', color: '#FFF', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
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

      {/* STATS */}
      {vue === 'stats' && (
        <div style={{ padding: 24 }}>
          {!statsDebloquees ? (
            <div style={{ maxWidth: 360, margin: '60px auto', textAlign: 'center' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 24 }}>🔒</div>
              <h2 style={{ fontSize: 16, fontWeight: 600, color: '#1a1a1a', marginBottom: 8 }}>Accès réservé</h2>
              <p style={{ fontSize: 13, color: '#888', marginBottom: 20 }}>Entrez le mot de passe pour accéder aux statistiques</p>
              <input type="password" value={mdpStats} onChange={e => setMdpStats(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { if (mdpStats === MDP_STATS) { setStatsDebloquees(true); setMdpErreur(false); } else setMdpErreur(true); } }}
                placeholder="Mot de passe" style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: `1px solid ${mdpErreur ? '#EF4444' : '#DDD'}`, fontSize: 14, marginBottom: 8, boxSizing: 'border-box' }} />
              {mdpErreur && <p style={{ color: '#EF4444', fontSize: 12, marginBottom: 8 }}>Mot de passe incorrect</p>}
              <button onClick={() => { if (mdpStats === MDP_STATS) { setStatsDebloquees(true); setMdpErreur(false); } else setMdpErreur(true); }}
                style={{ width: '100%', padding: '12px', borderRadius: 8, border: 'none', background: '#1a1a1a', color: '#FFF', cursor: 'pointer', fontSize: 14 }}>
                Accéder
              </button>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h2 style={{ fontSize: 16, fontWeight: 600, color: '#1a1a1a', margin: 0 }}>Statistiques</h2>
                <button onClick={() => { setStatsDebloquees(false); setMdpStats(''); }} style={{ padding: '6px 12px', borderRadius: 6, border: `0.5px solid #DDD`, background: CREME, color: '#666', cursor: 'pointer', fontSize: 12 }}>Verrouiller</button>
              </div>

              <div style={{ background: '#FFF', borderRadius: 10, padding: 16, border: `0.5px solid ${BORDER}`, marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a', marginBottom: 12 }}>Aujourd'hui — {today}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
                  {[
                    { label: 'Total', value: `${totalJour.toFixed(2)} TND`, color: BRUN },
                    { label: 'Ticket moyen', value: `${ticketMoyen.toFixed(2)} TND`, color: '#1E40AF' },
                    { label: 'Tables servies', value: histoAujourdhui.length, color: '#166534' },
                  ].map((s, i) => (
                    <div key={i} style={{ background: CREME2, borderRadius: 8, padding: '12px', border: `0.5px solid ${BORDER}` }}>
                      <div style={{ fontSize: 10, color: '#666', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>{s.label}</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{s.value}</div>
                    </div>
                  ))}
                </div>
                {produitsPlusVendus().length > 0 && (
                  <div>
                    <div style={{ fontSize: 11, color: '#666', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Top produits</div>
                    {produitsPlusVendus().map(([nom, qte], i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13, borderBottom: `0.5px solid #F0F0F0` }}>
                        <span>{i + 1}. {nom}</span><span style={{ fontWeight: 600, color: BRUN }}>{qte}×</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ background: '#FFF', borderRadius: 10, padding: 16, border: `0.5px solid ${BORDER}`, marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a', marginBottom: 12 }}>Archives par mois</div>
                {moisDisponibles.length === 0 ? <p style={{ color: '#999', fontSize: 13 }}>Aucun historique</p> : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {moisDisponibles.map(mois => (
                      <div key={mois}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: 8, border: `0.5px solid ${moisOuvert === mois ? BRUN : '#DDD'}`, background: moisOuvert === mois ? '#FFF8F4' : '#F8F8F8', cursor: 'pointer' }}
                          onClick={() => setMoisOuvert(moisOuvert === mois ? null : mois)}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 16 }}>📁</span>
                            <span style={{ fontSize: 13, fontWeight: 600 }}>{mois}</span>
                            <span style={{ fontSize: 11, color: '#999' }}>{historique.filter(h => h.mois === mois).length} tables</span>
                          </div>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button onClick={(e) => { e.stopPropagation(); exporterExcel(mois); }}
                              style={{ padding: '4px 10px', borderRadius: 6, border: `0.5px solid #DDD`, background: '#FFF', color: '#1a1a1a', cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                              Excel
                            </button>
                            <span style={{ fontSize: 12, color: '#999' }}>{moisOuvert === mois ? '▲' : '▼'}</span>
                          </div>
                        </div>
                        {moisOuvert === mois && (
                          <div style={{ marginTop: 4, marginLeft: 16, display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {joursParMois(mois).map(jour => {
                              const stats = statsParJour(jour);
                              return (
                                <div key={jour}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderRadius: 8, border: `0.5px solid ${jourOuvert === jour ? '#1E40AF' : '#E0E0E0'}`, background: jourOuvert === jour ? '#EBF5FB' : '#FAFAFA', cursor: 'pointer' }}
                                    onClick={() => setJourOuvert(jourOuvert === jour ? null : jour)}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                      <span style={{ fontSize: 14 }}>📄</span>
                                      <span style={{ fontSize: 12, fontWeight: 500 }}>{jour}</span>
                                    </div>
                                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                                      <span style={{ fontSize: 12, color: BRUN, fontWeight: 600 }}>{stats.total.toFixed(2)} TND</span>
                                      <span style={{ fontSize: 11, color: '#999' }}>{stats.tables} table{stats.tables > 1 ? 's' : ''}</span>
                                      <span style={{ fontSize: 11, color: '#999' }}>{jourOuvert === jour ? '▲' : '▼'}</span>
                                    </div>
                                  </div>
                                  {jourOuvert === jour && (
                                    <div style={{ marginLeft: 16, background: '#FFF', borderRadius: 8, padding: 12, border: `0.5px solid #E0E0E0`, marginTop: 4 }}>
                                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
                                        {[
                                          { label: 'Total', value: `${stats.total.toFixed(2)} TND`, color: BRUN },
                                          { label: 'Ticket moyen', value: `${stats.ticket.toFixed(2)} TND`, color: '#1E40AF' },
                                          { label: 'Tables', value: stats.tables, color: '#166534' },
                                        ].map((s, i) => (
                                          <div key={i} style={{ background: CREME2, borderRadius: 6, padding: '8px 10px' }}>
                                            <div style={{ fontSize: 9, color: '#666', marginBottom: 2, textTransform: 'uppercase' }}>{s.label}</div>
                                            <div style={{ fontSize: 14, fontWeight: 700, color: s.color }}>{s.value}</div>
                                          </div>
                                        ))}
                                      </div>
                                      {stats.top.length > 0 && (
                                        <div>
                                          <div style={{ fontSize: 10, color: '#666', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Top produits</div>
                                          {stats.top.map(([nom, qte], i) => (
                                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: 12, borderBottom: `0.5px solid #F5F5F5` }}>
                                              <span>{i + 1}. {nom}</span><span style={{ fontWeight: 600, color: BRUN }}>{qte}×</span>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {tablePlusRentable() && (
                <div style={{ background: '#FFF', borderRadius: 10, padding: 16, border: `0.5px solid ${BORDER}` }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a', marginBottom: 12 }}>Table la plus rentable aujourd'hui</div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 36, fontWeight: 700, color: BRUN }}>Table {tablePlusRentable()[0]}</div>
                    <div style={{ fontSize: 20, color: '#666', marginTop: 4 }}>{tablePlusRentable()[1].toFixed(2)} TND</div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* POPUP MODIFIER COMMANDE */}
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
                    {p.ingredientsRetires?.length > 0 && <div style={{ fontSize: 10, color: '#EF4444' }}>Sans : {p.ingredientsRetires.join(', ')}</div>}
                    {p.supplementsChoisis?.length > 0 && <div style={{ fontSize: 10, color: '#166534' }}>+ {Array.isArray(p.supplementsChoisis) ? p.supplementsChoisis.join(', ') : p.supplementsChoisis}</div>}
                    {p.ajouteParServeur && <div style={{ fontSize: 10, color: '#8B7355', fontStyle: 'italic' }}>Ajouté par le serveur</div>}
                  </div>
                  <span style={{ fontSize: 13, color: '#999', minWidth: 70, textAlign: 'right' }}>{(p.prix * p.quantite).toFixed(2)} TND</span>
                  <button onClick={() => diminuerArticle(commandeSelectee, i)} style={{ width: 26, height: 26, borderRadius: '50%', border: `0.5px solid #DDD`, background: '#F5F5F5', color: '#333', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                  <span style={{ fontWeight: 600, minWidth: 16, textAlign: 'center' }}>{p.quantite}</span>
                  <button onClick={() => ajouterArticle(commandeSelectee, p, false)} style={{ width: 26, height: 26, borderRadius: '50%', border: 'none', background: '#1a1a1a', color: '#FFF', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                  <button onClick={() => supprimerArticle(commandeSelectee, i)} style={{ background: 'none', border: 'none', color: '#EF4444', fontSize: 16, cursor: 'pointer', padding: '0 4px' }}>✕</button>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0 0', fontWeight: 700, fontSize: 15, color: BRUN }}>
                <span>Total</span><span>{(commandeSelecteeLive?.total || 0).toFixed(2)} TND</span>
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
              {modifie ? '✓ Modifications enregistrées — Fermer' : 'Fermer'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;