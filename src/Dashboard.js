import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, onSnapshot, doc, updateDoc, addDoc, serverTimestamp, deleteDoc, setDoc } from 'firebase/firestore';
import * as XLSX from 'xlsx';
import { QRCodeCanvas } from 'qrcode.react';

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
  const [suppressions, setSuppression] = useState([]);
  const [suppressionSelectee, setSuppressionSelectee] = useState(null);
  const [pinSuppression, setPinSuppression] = useState('');
  const [pinErreur, setPinErreur] = useState(false);
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
  const [articlesSelectionnes, setArticlesSelectionnes] = useState({});
  const [additionModifTable, setAdditionModifTable] = useState(null);
  const [moisOuvert, setMoisOuvert] = useState(null);
  const [jourOuvert, setJourOuvert] = useState(null);
  const [menuProduits, setMenuProduits] = useState([]);
  const [produitEdite, setProduitEdite] = useState(null);
  const [nouvelIngredient, setNouvelIngredient] = useState('');
  const [nouveauSupNom, setNouveauSupNom] = useState('');
  const [nouveauSupPrix, setNouveauSupPrix] = useState('');
  const [photoUploading, setPhotoUploading] = useState(false);
  const [showCaSidebar, setShowCaSidebar] = useState(() => {
    const v = localStorage.getItem('qresto_show_ca_sidebar');
    return v === null ? true : v === 'true';
  });
  const [hoveredNav, setHoveredNav] = useState(null);
  const [hoveredTab, setHoveredTab] = useState(null);
  const [hoveredEl, setHoveredEl] = useState(null);
  const [tableAccordionOuvert, setTableAccordionOuvert] = useState(null);
  const [tablesQR, setTablesQR] = useState([]);
  const [showNouvelleCommande, setShowNouvelleCommande] = useState(false);
  const [ncTable, setNcTable] = useState(1);
  const [ncPanier, setNcPanier] = useState([]);
  const [ncConfig, setNcConfig] = useState(null);

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
    const unsub3 = onSnapshot(collection(db, 'suppressions'), (snap) => {
      setSuppression(snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.heure?.seconds || 0) - (a.heure?.seconds || 0)));
    });
    return () => { unsub1(); unsub2(); unsub3(); };
  }, [commandeSelectee]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'menu'), (snap) => {
      setMenuProduits(snap.docs.map(d => ({ ...d.data(), id: d.id })).sort((a, b) => Number(a.id) - Number(b.id)));
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsubStocks = onSnapshot(doc(db, 'stocks', 'produits'), (snap) => { if (snap.exists()) setStocks(snap.data()); });
    const unsubSupplements = onSnapshot(doc(db, 'stocks', 'supplements'), (snap) => { if (snap.exists()) setStocksSupplements(snap.data()); });
    const unsubTables = onSnapshot(doc(db, 'config', 'tables'), (snap) => {
      if (snap.exists()) {
        setTablesQR((snap.data().tables || []).slice().sort((a, b) => a - b));
      } else {
        setDoc(doc(db, 'config', 'tables'), { tables: [1, 2, 3, 4, 5] });
      }
    });
    return () => { unsubStocks(); unsubSupplements(); unsubTables(); };
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
    const now = new Date();
    await addDoc(collection(db, 'suppressions'), {
      commandeId: commande.id,
      table: commande.table,
      produits: commande.produits || [],
      total: commande.total || 0,
      heure: serverTimestamp(),
      motif: 'manuel',
      date: now.toLocaleDateString('fr-FR'),
      mois: `${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`,
      annee: now.getFullYear(),
    });
    await deleteDoc(doc(db, 'commandes', commande.id));
  };

  const restaurerCommande = async (suppression) => {
    await addDoc(collection(db, 'commandes'), {
      table: suppression.table, produits: suppression.produits, total: suppression.total,
      statut: 'en_attente', heure: serverTimestamp(), restauree: true,
    });
    await deleteDoc(doc(db, 'suppressions', suppression.id));
    setSuppressionSelectee(null);
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
    const total = produits.filter(p => !p.supprimeParServeur).reduce((acc, p) => acc + p.prix * p.quantite, 0);
    await updateDoc(doc(db, 'commandes', derniereCmd.id), { produits, total });
  };

  const supprimerArticleAddition = async (cmdId, idx) => {
    const cmd = commandes.find(c => c.id === cmdId);
    if (!cmd) return;
    const produits = cmd.produits.map((p, i) => i === idx ? { ...p, supprimeParServeur: true } : p);
    const total = produits.filter(p => !p.supprimeParServeur).reduce((acc, p) => acc + p.prix * p.quantite, 0);
    await updateDoc(doc(db, 'commandes', cmdId), { produits, total });
  };

  const payerSelection = (table, mode) => {
    const sel = articlesSelectionnes[table] || {};
    const cmdsTable = commandes.filter(c => c.table === table);
    const heure = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const nouveauxPaiements = [];
    cmdsTable.forEach(cmd => {
      (cmd.produits || []).forEach((p, idx) => {
        if (p.supprimeParServeur) return;
        const key = `${cmd.id}-${idx}`;
        if (sel[key]) {
          const deja = montantDejaPayeArticle(table, cmd.id, idx);
          const reste = Math.max(0, p.prix * p.quantite - deja);
          if (reste > 0) nouveauxPaiements.push({ montant: reste, mode, heure, articleKey: key, label: p.nom });
        }
      });
    });
    setPaiementsTable(prev => ({ ...prev, [table]: [...(prev[table] || []), ...nouveauxPaiements] }));
    setArticlesSelectionnes(prev => ({ ...prev, [table]: {} }));
  };

  const selectionMontant = (table) => {
    const sel = articlesSelectionnes[table] || {};
    return commandes.filter(c => c.table === table).reduce((acc, cmd) => {
      (cmd.produits || []).forEach((p, idx) => {
        if (p.supprimeParServeur) return;
        if (sel[`${cmd.id}-${idx}`]) acc += Math.max(0, p.prix * p.quantite - montantDejaPayeArticle(table, cmd.id, idx));
      });
      return acc;
    }, 0);
  };

  const payerTout = (table, mode) => {
    const reste = resteAPayer(table);
    if (reste <= 0) return;
    const heure = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const cmdsTable = commandes.filter(c => c.table === table);
    const nouveauxPaiements = [];
    cmdsTable.forEach(cmd => {
      (cmd.produits || []).forEach((p, idx) => {
        if (p.supprimeParServeur) return;
        const dejaPaye = montantDejaPayeArticle(table, cmd.id, idx);
        const resteArticle = Math.max(0, p.prix * p.quantite - dejaPaye);
        if (resteArticle > 0) {
          nouveauxPaiements.push({
            montant: resteArticle,
            mode,
            heure,
            articleKey: `${cmd.id}-${idx}`,
            label: p.nom,
          });
        }
      });
    });
    setPaiementsTable(prev => ({
      ...prev,
      [table]: [...(prev[table] || []), ...nouveauxPaiements],
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
    setArticlesSelectionnes(p => { const n = { ...p }; delete n[table]; return n; });
  };

  const ncFermer = () => { setShowNouvelleCommande(false); setNcPanier([]); setNcConfig(null); setNcTable(1); };

  const ncAjouter = (produit, supplementsChoisis = [], ingredientsRetires = []) => {
    setNcPanier(prev => {
      if (produit.type === 'sale') {
        const key = `${produit.id}|${supplementsChoisis.sort().join(',')}|${ingredientsRetires.sort().join(',')}`;
        const idx = prev.findIndex(p => p._ncKey === key);
        if (idx >= 0) return prev.map((p, i) => i === idx ? { ...p, quantite: p.quantite + 1 } : p);
        return [...prev, { ...produit, quantite: 1, supplementsChoisis, ingredientsRetires, ajouteParServeur: true, _ncKey: key }];
      }
      const idx = prev.findIndex(p => p.id === produit.id);
      if (idx >= 0) return prev.map((p, i) => i === idx ? { ...p, quantite: p.quantite + 1 } : p);
      return [...prev, { ...produit, quantite: 1, supplementsChoisis: [], ingredientsRetires: [], ajouteParServeur: true }];
    });
  };

  const ncEnvoyer = async () => {
    if (!ncPanier.length) return;
    const produits = ncPanier.map(({ _ncKey, ...p }) => p);
    const total = produits.reduce((acc, p) => acc + p.prix * p.quantite, 0);
    await addDoc(collection(db, 'commandes'), { table: Number(ncTable), produits, total, statut: 'en_attente', heure: serverTimestamp() });
    ncFermer();
    setSousVueCommandes('en_attente');
  };

  const ajouterTable = async () => {
    const prochain = tablesQR.length > 0 ? Math.max(...tablesQR) + 1 : 1;
    await setDoc(doc(db, 'config', 'tables'), { tables: [...tablesQR, prochain].sort((a, b) => a - b) });
  };

  const supprimerTable = async (num) => {
    if (!window.confirm(`Supprimer la Table ${num} ?`)) return;
    await setDoc(doc(db, 'config', 'tables'), { tables: tablesQR.filter(t => t !== num) });
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

  const CommandeCard = ({ commande }) => {
    const [hovered, setHovered] = useState(false);
    const [hoveredModifier, setHoveredModifier] = useState(false);
    const [hoveredAction, setHoveredAction] = useState(false);
    const [hoveredTrash, setHoveredTrash] = useState(false);
    const pillStyle = (s) => {
      if (s === 'en_attente') return { background: '#F5F5F5', color: '#555', border: '0.5px solid #E0E0E0' };
      if (s === 'en_preparation') return { background: '#F0F4FF', color: '#3366CC', border: '0.5px solid #C5D3F0' };
      return { background: '#F0F5F0', color: '#2D6A2D', border: '0.5px solid #C0D9C0' };
    };
    return (
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          background: '#FFF', borderRadius: 10, overflow: 'hidden',
          border: `0.5px solid ${hovered ? '#C0C8D8' : '#E2E8F0'}`,
          boxShadow: hovered ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
          transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
        }}>
        <div style={{ padding: '12px 20px', borderBottom: '0.5px solid #F0F0F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: 15, fontWeight: 500, color: '#1A202C' }}>Table {commande.table}</span>
            <span style={{ fontSize: 12, color: '#999', marginLeft: 8 }}>{formatHeure(commande.heure)}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ ...pillStyle(commande.statut), padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 500 }}>
              {statutLabel(commande.statut)}
            </span>
            <button onClick={() => supprimerCommande(commande)} title="Supprimer"
              onMouseEnter={() => setHoveredTrash(true)}
              onMouseLeave={() => setHoveredTrash(false)}
              style={{ background: hoveredTrash ? '#FEF2F2' : 'none', border: '0.5px solid #DDD', borderRadius: 6, cursor: 'pointer', color: hoveredTrash ? '#DC2626' : '#999', padding: '5px 7px', display: 'flex', alignItems: 'center' }}>
              <TrashIcon />
            </button>
          </div>
        </div>
        <div style={{ padding: '10px 20px', borderBottom: '0.5px solid #F0F0F0' }}>
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
        <div style={{ padding: '10px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 500, fontSize: 15, color: '#1A202C' }}>{commande.total?.toFixed(2)} TND</span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => ouvrirModifier(commande)}
              onMouseEnter={() => setHoveredModifier(true)}
              onMouseLeave={() => setHoveredModifier(false)}
              style={{ padding: '6px 12px', borderRadius: 6, border: `0.5px solid ${hoveredModifier ? '#B0B8C8' : '#CBD5E0'}`, background: hoveredModifier ? '#F7F8FA' : 'transparent', color: '#718096', cursor: 'pointer', fontSize: 12 }}>
              Modifier
            </button>
            {(commande.statut === 'en_attente' || commande.statut === 'en_preparation') && (
              <button
                onClick={() => changerStatut(commande.id, commande.statut === 'en_attente' ? 'en_preparation' : 'pret')}
                onMouseEnter={() => setHoveredAction(true)}
                onMouseLeave={() => setHoveredAction(false)}
                style={{ padding: '6px 12px', borderRadius: 6, border: 'none', background: hoveredAction ? '#2D3748' : '#1A202C', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 500 }}>
                {commande.statut === 'en_attente' ? 'En préparation →' : 'Servi ✓'}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  const navItems = [
    { key: 'commandes', label: 'Commandes', icon: 'ti-receipt' },
    { key: 'additions', label: 'Additions', icon: 'ti-cash' },
    { key: 'suppressions', label: 'Suppressions', icon: 'ti-trash' },
    { key: 'historique', label: 'Historique', icon: 'ti-history' },
    { key: 'stocks', label: 'Stocks', icon: 'ti-package' },
    { key: 'menu', label: 'Menu', icon: 'ti-tool' },
    { key: 'stats', label: 'Stats', icon: 'ti-chart-bar' },
    { key: 'tables', label: 'Tables & QR', icon: 'ti-qrcode' },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <style>{`
        * { font-family: -apple-system, BlinkMacSystemFont, 'Inter', sans-serif; }
        button { transition: all 0.15s ease; }
        .qr-bottom-nav { display: none !important; }
        .qr-accordion-content { transition: max-height 0.2s ease; }
        .qr-mobile-only { display: none !important; }
        .qr-accordion-arrow { display: none !important; }
        .qr-payer-short { display: none; }
        @media (min-width: 1025px) {
          .qr-sidebar { display: flex !important; }
          .qr-main-content { margin-left: 200px !important; }
        }
        @media (max-width: 1024px) {
          .qr-sidebar { display: none !important; }
          .qr-main-content { margin-left: 0 !important; padding-bottom: 56px; }
          .qr-bottom-nav { display: flex !important; }
        }
        @media (max-width: 767px) {
          .qr-desktop-only { display: none !important; }
          .qr-mobile-only { display: inline !important; }
          .qr-accordion-arrow { display: inline !important; }
          .qr-accordion-content { max-height: 0; overflow: hidden; }
          .qr-accordion-content.open { max-height: 3000px; }
          .qr-additions-outer { padding: 12px !important; max-width: none !important; }
          .qr-additions-grid { grid-template-columns: 1fr !important; }
          .qr-payer-btns { flex-direction: row !important; }
          .qr-payer-btns button { flex: 1; min-width: 0; font-size: 11px !important; padding: 8px 6px !important; white-space: nowrap !important; text-align: center !important; }
          .qr-payer-full { display: none !important; }
          .qr-payer-short { display: inline !important; }
        }
        @media (min-width: 768px) {
          .qr-accordion-content { max-height: none !important; overflow: visible; }
        }
      `}</style>

      {/* SIDEBAR */}
      <div className="qr-sidebar" style={{ width: 200, minWidth: 200, background: '#0B1220', height: '100vh', position: 'fixed', top: 0, left: 0, display: 'flex', flexDirection: 'column', zIndex: 10 }}>

        {/* Logo */}
        <div style={{ padding: '20px 18px 16px' }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: '#ffffff', letterSpacing: 0.3 }}>QResto</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 3 }}>d'inès × SANS+</div>
        </div>

        <div style={{ height: '0.5px', background: 'rgba(255,255,255,0.08)', margin: '0 12px' }} />

        {/* Nav items */}
        <nav style={{ flex: 1, padding: '10px 0', overflowY: 'auto' }}>
          {navItems.map(item => {
            const actif = vue === item.key;
            const navHov = hoveredNav === item.key;
            return (
              <button key={item.key} onClick={() => setVue(item.key)}
                onMouseEnter={() => setHoveredNav(item.key)}
                onMouseLeave={() => setHoveredNav(null)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 18px',
                  background: actif ? 'rgba(99,179,237,0.10)' : navHov ? 'rgba(255,255,255,0.06)' : 'transparent',
                  border: 'none',
                  borderLeft: `2px solid ${actif ? '#63B3ED' : 'transparent'}`,
                  color: actif ? '#ffffff' : navHov ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.45)',
                  cursor: 'pointer', fontSize: 13, textAlign: 'left',
                  transition: 'background 0.15s, color 0.15s',
                }}>
                <i className={`ti ${item.icon}`} style={{ fontSize: 16, flexShrink: 0 }} />
                <span style={{ flex: 1 }}>{item.label}</span>
                {item.key === 'commandes' && nbAttente > 0 && (
                  <span style={{ background: 'rgba(226,75,74,0.85)', color: '#fff', borderRadius: 10, fontSize: 10, fontWeight: 500, padding: '1px 6px', minWidth: 16, textAlign: 'center' }}>{nbAttente}</span>
                )}
                {item.key === 'suppressions' && suppressions.length > 0 && (
                  <span style={{ background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.7)', borderRadius: 10, fontSize: 10, fontWeight: 500, padding: '1px 6px' }}>{suppressions.length}</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Stats du jour */}
        {showCaSidebar && (
          <div style={{ margin: '0 10px 14px', background: 'rgba(99,179,237,0.05)', borderRadius: 8, padding: '12px 14px', border: '0.5px solid rgba(99,179,237,0.15)' }}>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>Aujourd'hui</div>
            <div style={{ fontSize: 17, fontWeight: 500, color: '#ffffff', lineHeight: 1.1 }}>
              {totalJour.toFixed(2)} <span style={{ fontSize: 11, fontWeight: 400, color: 'rgba(255,255,255,0.5)' }}>TND</span>
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>
              {histoAujourdhui.length} table{histoAujourdhui.length !== 1 ? 's' : ''} clôturée{histoAujourdhui.length !== 1 ? 's' : ''}
            </div>
          </div>
        )}
      </div>

      {/* MAIN CONTENT */}
      <div className="qr-main-content" style={{ flex: 1, marginLeft: 200, background: '#F4F6FB', minHeight: '100vh' }}>

      {/* TOPBAR */}
      <div style={{ height: 48, background: '#fff', borderBottom: '0.5px solid #E2E8F0', display: 'flex', alignItems: 'center', padding: '0 24px', gap: 16, position: 'sticky', top: 0, zIndex: 5 }}>
        <span style={{ fontSize: 14, fontWeight: 500, color: '#1A202C', flexShrink: 0 }}>
          {navItems.find(n => n.key === vue)?.label || ''}
        </span>
        {vue === 'commandes' && (
          <>
            <div style={{ display: 'flex', gap: 6 }}>
              {[
                { key: 'en_attente', label: 'En attente', count: nbAttente },
                { key: 'en_preparation', label: 'En préparation', count: nbPrep },
                { key: 'pret', label: 'Servies', count: nbServi },
              ].map(s => {
                const actif = sousVueCommandes === s.key;
                return (
                  <button key={s.key} onClick={() => setSousVueCommandes(s.key)}
                    onMouseEnter={() => setHoveredTab(s.key)}
                    onMouseLeave={() => setHoveredTab(null)}
                    style={{
                      padding: '4px 12px', borderRadius: 20,
                      background: actif ? 'rgba(99,179,237,0.12)' : hoveredTab === s.key ? '#F7F8FA' : 'transparent',
                      border: actif ? '0.5px solid rgba(99,179,237,0.4)' : '0.5px solid #E2E8F0',
                      color: actif ? '#2B6CB0' : '#718096',
                      fontWeight: actif ? 500 : 400,
                      cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6,
                      transition: 'background 0.15s ease',
                    }}>
                    {s.label}
                    {s.count > 0 && (
                      <span style={{ background: actif ? 'rgba(99,179,237,0.2)' : '#F3F4F6', color: actif ? '#2B6CB0' : '#718096', borderRadius: 10, fontSize: 10, fontWeight: 500, padding: '0 5px' }}>{s.count}</span>
                    )}
                  </button>
                );
              })}
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#48BB78' }} />
                <span style={{ fontSize: 12, color: '#48BB78', fontWeight: 500 }}>Live</span>
              </div>
              <button onClick={() => setShowNouvelleCommande(true)}
                style={{ padding: '5px 12px', borderRadius: 8, border: 'none', background: '#1A202C', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ fontSize: 15, lineHeight: 1 }}>+</span> Nouvelle commande
              </button>
            </div>
          </>
        )}
      </div>

      {/* COMMANDES */}
      {vue === 'commandes' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, padding: '16px 24px 0' }}>
            {[
              { label: 'En attente', value: nbAttente },
              { label: 'En préparation', value: nbPrep },
              { label: 'Ticket moyen du jour', value: `${ticketMoyen.toFixed(2)} TND` },
            ].map((kpi, i) => (
              <div key={i} style={{ background: '#fff', border: '0.5px solid #E2E8F0', borderRadius: 10, padding: 20 }}>
                <div style={{ fontSize: 11, color: '#718096', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>{kpi.label}</div>
                <div style={{ fontSize: 22, fontWeight: 500, color: '#1A202C' }}>{kpi.value}</div>
              </div>
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
      {vue === 'suppressions' && (() => {
        const MOIS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
        const moisLabel = (m) => { const [num] = m.split('-'); return MOIS_FR[parseInt(num) - 1] || m; };
        const annees = [...new Set(suppressions.map(s => s.annee).filter(Boolean))].sort((a, b) => b - a);
        const moisDeAnnee = (an) => [...new Set(suppressions.filter(s => s.annee === an).map(s => s.mois).filter(Boolean))].sort().reverse();
        const joursDeM = (m) => [...new Set(suppressions.filter(s => s.mois === m).map(s => s.date).filter(Boolean))].sort((a, b) => {
          const [jA, mA, aA] = a.split('/'); const [jB, mB, aB] = b.split('/');
          return new Date(`${aB}-${mB}-${jB}`) - new Date(`${aA}-${mA}-${jA}`);
        });
        const suppDuJour = (jour) => suppressions.filter(s => s.date === jour);
        const totalSupprime = suppressions.reduce((acc, s) => acc + (s.total || 0), 0);
        const [anneeOuverte, setAnneeOuverte] = [moisOuvert?.split?.('-')?.[1] ? null : null, () => {}];
        return (
        <div style={{ padding: 24, maxWidth: 900 }}>
          <h2 style={{ fontSize: 16, fontWeight: 500, color: '#1a1a1a', marginBottom: 16 }}>Commandes supprimées</h2>

          {/* Stats */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
            <div style={{ background: '#FFF', borderRadius: 10, padding: '12px 18px', border: `0.5px solid ${BORDER}`, minWidth: 130 }}>
              <div style={{ fontSize: 11, color: '#999', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 }}>Suppressions</div>
              <div style={{ fontSize: 22, fontWeight: 500, color: '#1a1a1a' }}>{suppressions.length}</div>
            </div>
            <div style={{ background: '#FFF', borderRadius: 10, padding: '12px 18px', border: `0.5px solid ${BORDER}`, minWidth: 160 }}>
              <div style={{ fontSize: 11, color: '#999', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 }}>Valeur supprimée</div>
              <div style={{ fontSize: 22, fontWeight: 500, color: '#EF4444' }}>{totalSupprime.toFixed(2)} <span style={{ fontSize: 13, fontWeight: 400, color: '#999' }}>TND</span></div>
            </div>
          </div>

          {suppressions.length === 0 && <div style={{ textAlign: 'center', marginTop: 60, color: '#999' }}>Aucune suppression enregistrée</div>}

          {/* Accordéon années */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {annees.map(annee => {
              const mois = moisDeAnnee(annee);
              const ouvert = jourOuvert === `annee-${annee}`;
              return (
                <div key={annee} style={{ background: '#FFF', borderRadius: 10, border: `0.5px solid ${BORDER}`, overflow: 'hidden' }}>
                  <div onClick={() => setJourOuvert(ouvert ? null : `annee-${annee}`)}
                    style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', background: ouvert ? '#F9F9F9' : '#FFF' }}>
                    <span style={{ fontWeight: 500, fontSize: 14 }}>{annee}</span>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <span style={{ fontSize: 12, color: '#999' }}>{suppressions.filter(s => s.annee === annee).length} suppression{suppressions.filter(s => s.annee === annee).length > 1 ? 's' : ''}</span>
                      <span style={{ fontSize: 11, color: '#999' }}>{ouvert ? '▲' : '▼'}</span>
                    </div>
                  </div>
                  {ouvert && (
                    <div style={{ borderTop: `0.5px solid #F0F0F0` }}>
                      {/* Accordéon mois */}
                      {mois.map(m => {
                        const jours = joursDeM(m);
                        const mOuvert = moisOuvert === m;
                        return (
                          <div key={m} style={{ borderBottom: `0.5px solid #F5F5F5` }}>
                            <div onClick={() => setMoisOuvert(mOuvert ? null : m)}
                              style={{ padding: '10px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', background: mOuvert ? 'rgba(0,0,0,0.02)' : 'transparent' }}>
                              <span style={{ fontSize: 13, fontWeight: 500, color: '#333' }}>{moisLabel(m)}</span>
                              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                <span style={{ fontSize: 11, color: '#aaa' }}>{suppressions.filter(s => s.mois === m).length} suppression{suppressions.filter(s => s.mois === m).length > 1 ? 's' : ''}</span>
                                <span style={{ fontSize: 10, color: '#bbb' }}>{mOuvert ? '▲' : '▼'}</span>
                              </div>
                            </div>
                            {mOuvert && (
                              <div style={{ paddingLeft: 8 }}>
                                {/* Accordéon jours */}
                                {jours.map(jour => {
                                  const suppJour = suppDuJour(jour);
                                  const jOuvert = `jour-${jour}`;
                                  const isJOuvert = tableAccordionOuvert === jOuvert;
                                  return (
                                    <div key={jour} style={{ borderTop: `0.5px solid #F5F5F5` }}>
                                      <div onClick={() => setTableAccordionOuvert(isJOuvert ? null : jOuvert)}
                                        style={{ padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                                        <span style={{ fontSize: 12, color: '#555', fontWeight: 500 }}>{jour}</span>
                                        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                          <span style={{ fontSize: 11, color: '#bbb' }}>{suppJour.length} suppression{suppJour.length > 1 ? 's' : ''}</span>
                                          <span style={{ fontSize: 10, color: '#bbb' }}>{isJOuvert ? '▲' : '▼'}</span>
                                        </div>
                                      </div>
                                      {isJOuvert && (
                                        <div style={{ paddingLeft: 12, paddingBottom: 8 }}>
                                          {suppJour.map(s => (
                                            <div key={s.id} onClick={() => { setSuppressionSelectee(s); setPinSuppression(''); setPinErreur(false); }}
                                              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 10px', marginBottom: 4, borderRadius: 8, border: `0.5px solid #E5E5E5`, background: '#FAFAFA', cursor: 'pointer' }}>
                                              <div>
                                                <span style={{ fontSize: 13, fontWeight: 500, color: '#1a1a1a' }}>Table {s.table}</span>
                                                <span style={{ fontSize: 11, color: '#999', marginLeft: 8 }}>{s.heure?.seconds ? new Date(s.heure.seconds * 1000).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                                              </div>
                                              <span style={{ fontSize: 13, fontWeight: 500, color: '#EF4444' }}>{(s.total || 0).toFixed(2)} TND</span>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Popup détail */}
          {suppressionSelectee && (
            <div onClick={() => setSuppressionSelectee(null)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
              <div onClick={e => e.stopPropagation()}
                style={{ background: '#FFF', borderRadius: 14, padding: 24, width: '100%', maxWidth: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 500, color: '#1a1a1a' }}>Table {suppressionSelectee.table}</div>
                    <div style={{ fontSize: 12, color: '#999', marginTop: 2 }}>
                      {suppressionSelectee.date} — {suppressionSelectee.heure?.seconds ? new Date(suppressionSelectee.heure.seconds * 1000).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : ''}
                    </div>
                  </div>
                  <button onClick={() => setSuppressionSelectee(null)} style={{ background: 'none', border: 'none', fontSize: 20, color: '#999', cursor: 'pointer', padding: '0 4px' }}>✕</button>
                </div>
                <div style={{ borderRadius: 8, border: `0.5px solid #E5E5E5`, overflow: 'hidden', marginBottom: 16 }}>
                  {suppressionSelectee.produits?.map((p, i) => (
                    <div key={i} style={{ padding: '8px 12px', borderBottom: i < suppressionSelectee.produits.length - 1 ? `0.5px solid #F0F0F0` : 'none' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#333' }}>
                        <span>{p.quantite}× {p.nom}</span>
                        <span style={{ color: '#999' }}>{(p.prix * p.quantite).toFixed(2)} TND</span>
                      </div>
                      {p.ingredientsRetires?.length > 0 && <div style={{ fontSize: 10, color: '#EF4444', marginTop: 2 }}>Sans : {p.ingredientsRetires.join(', ')}</div>}
                      {p.supplementsChoisis?.length > 0 && <div style={{ fontSize: 10, color: '#166534', marginTop: 2 }}>+ {p.supplementsChoisis.join(', ')}</div>}
                    </div>
                  ))}
                  <div style={{ padding: '10px 12px', background: '#F9F9F9', display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 500 }}>
                    <span>Total</span><span>{(suppressionSelectee.total || 0).toFixed(2)} TND</span>
                  </div>
                </div>
                <button onClick={() => restaurerCommande(suppressionSelectee)}
                  style={{ width: '100%', padding: '10px', borderRadius: 8, border: `0.5px solid #C8B400`, background: '#FFFDE7', color: '#7B6000', cursor: 'pointer', fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 10 }}>
                  <RestoreIcon /> Restaurer la commande
                </button>
                <div style={{ borderTop: `0.5px solid #F0F0F0`, paddingTop: 12 }}>
                  <div style={{ fontSize: 11, color: '#999', marginBottom: 8 }}>Suppression définitive — code requis</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input type="password" value={pinSuppression} onChange={e => { setPinSuppression(e.target.value); setPinErreur(false); }}
                      placeholder="Code PIN" style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: `0.5px solid ${pinErreur ? '#EF4444' : '#DDD'}`, fontSize: 13, outline: 'none' }} />
                    <button onClick={async () => {
                      if (pinSuppression !== 'boss2025') { setPinErreur(true); return; }
                      await deleteDoc(doc(db, 'suppressions', suppressionSelectee.id));
                      setSuppressionSelectee(null);
                    }} style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: '#EF4444', color: '#FFF', cursor: 'pointer', fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap' }}>
                      Supprimer définitivement
                    </button>
                  </div>
                  {pinErreur && <div style={{ fontSize: 12, color: '#EF4444', marginTop: 6 }}>Code incorrect</div>}
                </div>
              </div>
            </div>
          )}
        </div>
        );
      })()}

      {/* ADDITIONS */}
      {vue === 'additions' && (
        <div className="qr-additions-outer" style={{ padding: 24, maxWidth: 1200 }}>
          <h2 style={{ fontSize: 16, fontWeight: 500, color: '#1a1a1a', marginBottom: 4 }}>Additions par table</h2>
          <p style={{ fontSize: 13, color: '#888', marginBottom: 20 }}>Sélectionnez les articles à encaisser, puis choisissez le mode de paiement.</p>
          {tables.length === 0 && <div style={{ textAlign: 'center', marginTop: 60, color: '#999' }}>Aucune table active</div>}
          <div className="qr-additions-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
            {tables.map(table => {
              const cmds = commandesParTable(table);
              const total = totalTable(table);
              const paiements = paiementsTable[table] || [];
              const paye = totalPaye(table);
              const reste = resteAPayer(table);
              const toutRegle = reste === 0 && paiements.length > 0;
              const enModif = additionModifTable === table;
              const sel = articlesSelectionnes[table] || {};
              const nbSel = Object.values(sel).filter(Boolean).length;
              const montantSel = selectionMontant(table);

              return (
                <div key={table} style={{ background: '#FFF', borderRadius: 10, overflow: 'hidden', border: '0.5px solid #E2E8F0' }}>
                  <div onClick={() => setTableAccordionOuvert(prev => prev === table ? null : table)}
                    style={{ padding: '10px 14px', borderBottom: `0.5px solid #F0F0F0`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                    <span style={{ fontSize: 14, fontWeight: 500, color: '#1A202C' }}>Table {table}</span>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span className="qr-desktop-only" style={{ fontSize: 12, color: toutRegle ? '#2D6A2D' : '#718096', fontWeight: 500 }}>{toutRegle ? '✓ Tout réglé' : 'En cours'}</span>
                      <button className="qr-desktop-only" onClick={(e) => { e.stopPropagation(); setAdditionModifTable(enModif ? null : table); }}
                        style={{ padding: '4px 10px', borderRadius: 6, border: enModif ? 'none' : '0.5px solid #CBD5E0', background: enModif ? '#1A202C' : 'transparent', color: enModif ? '#fff' : '#718096', cursor: 'pointer', fontSize: 11 }}>
                        {enModif ? 'Terminer' : 'Modifier'}
                      </button>
                      <span className="qr-mobile-only" style={{ fontSize: 13, fontWeight: 500, color: toutRegle ? '#2D6A2D' : '#EF4444' }}>
                        {toutRegle ? '✓ Réglé' : `${reste.toFixed(2)} TND`}
                      </span>
                      <span className="qr-accordion-arrow" style={{ fontSize: 11, color: '#999' }}>
                        {tableAccordionOuvert === table ? '▲' : '▼'}
                      </span>
                    </div>
                  </div>
                  <div className={`qr-accordion-content${tableAccordionOuvert === table ? ' open' : ''}`}>
                  {!toutRegle && !enModif && (
                    <div className="qr-payer-btns" style={{ padding: '8px 14px', borderBottom: `0.5px solid #F0F0F0`, background: '#F9F9F9', display: 'flex', gap: 8 }}>
                      <button onClick={() => payerTout(table, 'especes')}
                        style={{ flex: 1, padding: '8px', borderRadius: 8, border: 'none', background: '#1A202C', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 500 }}>
                        <span className="qr-payer-full">Tout payer — Espèces ({reste.toFixed(2)} TND)</span>
                        <span className="qr-payer-short">Espèces</span>
                      </button>
                      <button onClick={() => payerTout(table, 'carte')}
                        style={{ flex: 1, padding: '8px', borderRadius: 8, border: '0.5px solid #CBD5E0', background: 'transparent', color: '#718096', cursor: 'pointer', fontSize: 12, fontWeight: 500 }}>
                        <span className="qr-payer-full">Tout payer — Carte</span>
                        <span className="qr-payer-short">Carte</span>
                      </button>
                    </div>
                  )}
                  <div style={{ padding: '10px 14px', borderBottom: `0.5px solid #F0F0F0` }}>
                    {enModif && <div style={{ fontSize: 11, color: '#718096', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Mode modification</div>}
                    {cmds.map((cmd, i) => (
                      <div key={cmd.id} style={{ marginBottom: i < cmds.length - 1 ? 8 : 0 }}>
                        <div style={{ fontSize: 11, color: '#999', marginBottom: 3 }}>Commande {i + 1} — {formatHeure(cmd.heure)}</div>
                        {cmd.produits?.map((p, j) => {
                          const supprime = !!p.supprimeParServeur;
                          const dejaPayePourCetArticle = supprime ? 0 : montantDejaPayeArticle(table, cmd.id, j);
                          const prixArticle = p.prix * p.quantite;
                          const resteArticle = supprime ? 0 : Math.max(0, prixArticle - dejaPayePourCetArticle);
                          const estPayeTotal = !supprime && dejaPayePourCetArticle >= prixArticle;
                          const articleKey = `${cmd.id}-${j}`;
                          const estSelectionne = !!sel[articleKey];
                          return (
                            <div key={j} style={{ marginBottom: 4 }}>
                              <div
                                onClick={() => {
                                  if (estPayeTotal || enModif || supprime) return;
                                  setArticlesSelectionnes(prev => ({
                                    ...prev,
                                    [table]: { ...(prev[table] || {}), [articleKey]: !prev[table]?.[articleKey] }
                                  }));
                                }}
                                style={{
                                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                  fontSize: 13, padding: '7px 10px', borderRadius: 6,
                                  cursor: estPayeTotal || enModif || supprime ? 'default' : 'pointer',
                                  background: supprime ? '#FAFAFA' : estPayeTotal ? '#F0F5F0' : estSelectionne ? 'rgba(99,179,237,0.10)' : '#F9F9F9',
                                  border: `0.5px solid ${supprime ? '#EBEBEB' : estPayeTotal ? '#C0D9C0' : estSelectionne ? '#3182CE' : '#E5E5E5'}`,
                                  borderLeft: estSelectionne ? '2px solid #3182CE' : undefined,
                                  transition: 'all 0.15s ease',
                                  opacity: supprime ? 0.7 : 1,
                                }}>
                                <div style={{ flex: 1 }}>
                                  <div style={{ color: supprime ? '#999' : estPayeTotal ? '#2D6A2D' : '#333', textDecoration: supprime ? 'line-through' : 'none' }}>
                                    {p.quantite}× {p.nom}
                                    {p.supplementsChoisis?.length > 0 && <span style={{ fontSize: 10, color: supprime ? '#bbb' : '#166534', marginLeft: 4 }}>+{Array.isArray(p.supplementsChoisis) ? p.supplementsChoisis.join(', ') : p.supplementsChoisis}</span>}
                                  </div>
                                  {supprime && <div style={{ fontSize: 10, color: '#EF4444', fontStyle: 'italic', marginTop: 1 }}>Retiré par le serveur</div>}
                                  {p.ajouteParServeur && !supprime && <div style={{ fontSize: 10, color: '#8B7355', fontStyle: 'italic', marginTop: 1 }}>Ajouté par le serveur</div>}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  {!supprime && (
                                    <span style={{ color: estPayeTotal ? '#2D6A2D' : '#333', fontWeight: estPayeTotal ? 500 : 400 }}>
                                      {estPayeTotal ? '✓ Payé' : `${resteArticle.toFixed(2)} TND`}
                                    </span>
                                  )}
                                  {enModif && !supprime && (
                                    <button onClick={(e) => { e.stopPropagation(); supprimerArticleAddition(cmd.id, j); }}
                                      style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', fontSize: 16, padding: '0 2px', marginLeft: 4 }}>✕</button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                  {!enModif && nbSel > 0 && (
                    <div style={{ padding: '10px 14px', background: 'rgba(99,179,237,0.08)', borderBottom: '0.5px solid #BEE3F8', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 13, fontWeight: 500, color: '#2C5282' }}>Sélection : {montantSel.toFixed(2)} TND</span>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => payerSelection(table, 'especes')} style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: '#1A202C', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 500 }}>Payer — Espèces</button>
                        <button onClick={() => payerSelection(table, 'carte')} style={{ padding: '8px 14px', borderRadius: 8, border: '0.5px solid #3182CE', background: 'transparent', color: '#3182CE', cursor: 'pointer', fontSize: 12, fontWeight: 500 }}>Payer — Carte</button>
                      </div>
                    </div>
                  )}
                  {enModif && (
                    <div style={{ padding: '10px 14px', borderBottom: `0.5px solid #F0F0F0`, background: '#FFF8F0' }}>
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
                  {paiements.length > 0 && (
                    <div style={{ padding: '8px 14px', borderBottom: `0.5px solid #F0F0F0`, background: '#F9F9F9' }}>
                      <div style={{ fontSize: 11, color: '#999', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Paiements reçus</div>
                      {paiements.map((p, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#333', padding: '3px 0' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ background: '#F3F4F6', color: '#555', padding: '1px 8px', borderRadius: 10, fontSize: 10, fontWeight: 500 }}>{p.mode === 'carte' ? 'Carte' : 'Espèces'}</span>
                            {p.label && <span style={{ color: '#999' }}>{p.label}</span>}
                            <span style={{ color: '#999' }}>{p.heure}</span>
                          </span>
                          <span style={{ fontWeight: 500, color: '#166534' }}>−{p.montant.toFixed(2)} TND</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{ padding: '10px 14px', borderBottom: `0.5px solid #F0F0F0` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                      <span style={{ color: '#666' }}>Total</span>
                      <span style={{ fontWeight: 500 }}>{total.toFixed(2)} TND</span>
                    </div>
                    {paye > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                        <span style={{ color: '#666' }}>Payé</span>
                        <span style={{ color: '#166534', fontWeight: 500 }}>−{paye.toFixed(2)} TND</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 500, color: '#1A202C', borderTop: `0.5px solid #F0F0F0`, paddingTop: 8, marginTop: 4 }}>
                      <span>Reste à payer</span>
                      <span>{reste.toFixed(2)} TND</span>
                    </div>
                  </div>
                  <div style={{ padding: '10px 14px' }}>
                    <button onClick={() => cloturerTable(table)} disabled={!toutRegle}
                      style={{ width: '100%', padding: '10px', borderRadius: 8, border: 'none', background: toutRegle ? '#1A202C' : '#E0E0E0', color: toutRegle ? '#fff' : '#999', cursor: toutRegle ? 'pointer' : 'not-allowed', fontSize: 13, fontWeight: 500 }}>
                      {toutRegle ? 'Clôturer la table ✓' : "Régler d'abord le solde"}
                    </button>
                  </div>
                  </div>{/* /qr-accordion-content */}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* HISTORIQUE */}
      {vue === 'historique' && (
        <div style={{ padding: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 500, color: '#1a1a1a', marginBottom: 4 }}>Historique des additions</h2>
          <p style={{ fontSize: 13, color: '#888', marginBottom: 20 }}>Tables clôturées aujourd'hui</p>
          {historique.filter(h => h.date === today).length === 0 && <div style={{ textAlign: 'center', marginTop: 60, color: '#999' }}>Aucun historique aujourd'hui</div>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {historique.filter(h => h.date === today).map(h => (
              <div key={h.id} style={{ background: '#FFF', borderRadius: 10, overflow: 'hidden', border: `0.5px solid ${BORDER}` }}>
                <div style={{ padding: '10px 16px', borderBottom: `0.5px solid #F0F0F0`, display: 'flex', justifyContent: 'space-between', background: '#F9F9F9' }}>
                  <span style={{ fontWeight: 500 }}>Table {h.table}</span>
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
                          <span style={{ background: '#F3F4F6', color: '#555', padding: '1px 8px', borderRadius: 10, fontSize: 10 }}>{p.mode === 'carte' ? 'Carte' : 'Espèces'}</span>
                          {p.label && <span>{p.label}</span>}
                        </span>
                        <span>{p.montant.toFixed(2)} TND</span>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ padding: '10px 16px' }}>
                  <span style={{ fontWeight: 500, fontSize: 15, color: '#1A202C' }}>Total payé : {h.total?.toFixed(2)} TND</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* STOCKS */}
      {vue === 'stocks' && (
        <div style={{ padding: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 500, color: '#1a1a1a', marginBottom: 4 }}>Stocks journaliers</h2>
          <p style={{ fontSize: 13, color: '#888', marginBottom: 20 }}>Gérez les stocks des produits et suppléments.</p>
          <h3 style={{ fontSize: 14, fontWeight: 500, color: '#1a1a1a', marginBottom: 12 }}>Produits</h3>
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
                      <span style={{ fontSize: 16, fontWeight: 500, color: stock.stock === 0 ? '#EF4444' : '#1a1a1a', minWidth: 28, textAlign: 'center' }}>{stock.stock}</span>
                      <button onClick={() => { const nouv = { ...stocks, [produit.id]: { ...stocks[produit.id], stock: (stocks[produit.id]?.stock || 0) + 1 } }; setStocks(nouv); setDoc(doc(db, 'stocks', 'produits'), nouv); }} style={{ width: 28, height: 28, borderRadius: '50%', border: 'none', background: '#1a1a1a', color: '#FFF', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                      {stock.stock === 0 && <span style={{ fontSize: 11, color: '#EF4444', fontWeight: 500 }}>ÉPUISÉ</span>}
                    </div>
                  )}
                  {!stock.actif && <span style={{ fontSize: 12, color: '#999', fontStyle: 'italic' }}>Illimité</span>}
                </div>
              );
            })}
          </div>
          <h3 style={{ fontSize: 14, fontWeight: 500, color: '#1a1a1a', marginBottom: 12 }}>Suppléments</h3>
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
                      <span style={{ fontSize: 16, fontWeight: 500, color: stock.stock === 0 ? '#EF4444' : '#1a1a1a', minWidth: 28, textAlign: 'center' }}>{stock.stock}</span>
                      <button onClick={() => { const nouv = { ...stocksSupplements, [sup.id]: { ...stocksSupplements[sup.id], stock: (stocksSupplements[sup.id]?.stock || 0) + 1 } }; setStocksSupplements(nouv); setDoc(doc(db, 'stocks', 'supplements'), nouv); }} style={{ width: 28, height: 28, borderRadius: '50%', border: 'none', background: '#1a1a1a', color: '#FFF', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                      {stock.stock === 0 && <span style={{ fontSize: 11, color: '#EF4444', fontWeight: 500 }}>ÉPUISÉ</span>}
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
              <h2 style={{ fontSize: 16, fontWeight: 500, color: '#1a1a1a', marginBottom: 8 }}>Accès réservé</h2>
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
                <h2 style={{ fontSize: 16, fontWeight: 500, color: '#1a1a1a', margin: 0 }}>Statistiques</h2>
                <button onClick={() => { setStatsDebloquees(false); setMdpStats(''); }} style={{ padding: '6px 12px', borderRadius: 6, border: `0.5px solid #DDD`, background: CREME, color: '#666', cursor: 'pointer', fontSize: 12 }}>Verrouiller</button>
              </div>
              <div style={{ background: '#fff', borderRadius: 10, padding: '14px 16px', border: '0.5px solid #E2E8F0', marginBottom: 20 }}>
                <div style={{ fontSize: 12, color: '#718096', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.8 }}>Paramètres affichage</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: 13, color: '#1A202C', fontWeight: 500 }}>CA visible en sidebar</div>
                    <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>{showCaSidebar ? 'Le bloc CA du jour est affiché en bas de la sidebar' : 'Le bloc CA du jour est masqué'}</div>
                  </div>
                  <div
                    onClick={() => {
                      const next = !showCaSidebar;
                      setShowCaSidebar(next);
                      localStorage.setItem('qresto_show_ca_sidebar', String(next));
                    }}
                    style={{ width: 40, height: 22, borderRadius: 11, background: showCaSidebar ? '#1A202C' : '#CBD5E0', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
                    <div style={{ position: 'absolute', top: 3, left: showCaSidebar ? 20 : 3, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
                  </div>
                </div>
              </div>
              <div style={{ background: '#FFF', borderRadius: 10, padding: 16, border: `0.5px solid ${BORDER}`, marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: '#1a1a1a', marginBottom: 12 }}>Aujourd'hui — {today}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
                  {[
                    { label: 'Total', value: `${totalJour.toFixed(2)} TND`, color: '#1A202C' },
                    { label: 'Ticket moyen', value: `${ticketMoyen.toFixed(2)} TND`, color: '#1A202C' },
                    { label: 'Tables servies', value: histoAujourdhui.length, color: '#1A202C' },
                  ].map((s, i) => (
                    <div key={i} style={{ background: '#F8F9FA', borderRadius: 8, padding: '12px', border: '0.5px solid #E2E8F0' }}>
                      <div style={{ fontSize: 10, color: '#666', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>{s.label}</div>
                      <div style={{ fontSize: 18, fontWeight: 500, color: s.color }}>{s.value}</div>
                    </div>
                  ))}
                </div>
                {produitsPlusVendus().length > 0 && (
                  <div>
                    <div style={{ fontSize: 11, color: '#666', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Top produits</div>
                    {produitsPlusVendus().map(([nom, qte], i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13, borderBottom: `0.5px solid #F0F0F0` }}>
                        <span>{i + 1}. {nom}</span><span style={{ fontWeight: 500, color: '#1A202C' }}>{qte}×</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ background: '#FFF', borderRadius: 10, padding: 16, border: `0.5px solid ${BORDER}`, marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: '#1a1a1a', marginBottom: 12 }}>Archives par mois</div>
                {moisDisponibles.length === 0 ? <p style={{ color: '#999', fontSize: 13 }}>Aucun historique</p> : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {moisDisponibles.map(mois => (
                      <div key={mois}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: 8, border: `0.5px solid ${moisOuvert === mois ? '#C0C8D8' : '#E2E8F0'}`, background: moisOuvert === mois ? '#F7F8FA' : '#F8F8F8', cursor: 'pointer' }}
                          onClick={() => setMoisOuvert(moisOuvert === mois ? null : mois)}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 16 }}>📁</span>
                            <span style={{ fontSize: 13, fontWeight: 500 }}>{mois}</span>
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
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderRadius: 8, border: `0.5px solid ${jourOuvert === jour ? '#C0C8D8' : '#E0E0E0'}`, background: jourOuvert === jour ? '#F7F8FA' : '#FAFAFA', cursor: 'pointer' }}
                                    onClick={() => setJourOuvert(jourOuvert === jour ? null : jour)}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                      <span style={{ fontSize: 14 }}>📄</span>
                                      <span style={{ fontSize: 12, fontWeight: 500 }}>{jour}</span>
                                    </div>
                                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                                      <span style={{ fontSize: 12, color: '#1A202C', fontWeight: 500 }}>{stats.total.toFixed(2)} TND</span>
                                      <span style={{ fontSize: 11, color: '#999' }}>{stats.tables} table{stats.tables > 1 ? 's' : ''}</span>
                                      <span style={{ fontSize: 11, color: '#999' }}>{jourOuvert === jour ? '▲' : '▼'}</span>
                                    </div>
                                  </div>
                                  {jourOuvert === jour && (
                                    <div style={{ marginLeft: 16, background: '#FFF', borderRadius: 8, padding: 12, border: `0.5px solid #E0E0E0`, marginTop: 4 }}>
                                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
                                        {[
                                          { label: 'Total', value: `${stats.total.toFixed(2)} TND`, color: '#1A202C' },
                                          { label: 'Ticket moyen', value: `${stats.ticket.toFixed(2)} TND`, color: '#1A202C' },
                                          { label: 'Tables', value: stats.tables, color: '#1A202C' },
                                        ].map((s, i) => (
                                          <div key={i} style={{ background: '#F8F9FA', borderRadius: 6, padding: '8px 10px' }}>
                                            <div style={{ fontSize: 9, color: '#666', marginBottom: 2, textTransform: 'uppercase' }}>{s.label}</div>
                                            <div style={{ fontSize: 14, fontWeight: 500, color: s.color }}>{s.value}</div>
                                          </div>
                                        ))}
                                      </div>
                                      {stats.top.length > 0 && (
                                        <div>
                                          <div style={{ fontSize: 10, color: '#666', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Top produits</div>
                                          {stats.top.map(([nom, qte], i) => (
                                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: 12, borderBottom: `0.5px solid #F5F5F5` }}>
                                              <span>{i + 1}. {nom}</span><span style={{ fontWeight: 500, color: '#1A202C' }}>{qte}×</span>
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
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#1a1a1a', marginBottom: 12 }}>Table la plus rentable aujourd'hui</div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 36, fontWeight: 500, color: '#1A202C' }}>Table {tablePlusRentable()[0]}</div>
                    <div style={{ fontSize: 20, color: '#666', marginTop: 4 }}>{tablePlusRentable()[1].toFixed(2)} TND</div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* MENU */}
      {vue === 'menu' && !produitEdite && (
        <div style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h2 style={{ fontSize: 16, fontWeight: 500, color: '#1a1a1a', margin: 0 }}>Gestion du menu</h2>
            <button onClick={() => setProduitEdite({ id: Date.now().toString(), nom: '', prix: '', emoji: '', categorie: '', type: 'boisson', description: '', provenance: '', composition: '', ingredients: [], supplements: [], actif: true, photoURL: '' })}
              style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#1a1a1a', color: '#FFF', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
              + Nouveau produit
            </button>
          </div>
          {Object.entries(menuProduits.reduce((acc, p) => { (acc[p.categorie] = acc[p.categorie] || []).push(p); return acc; }, {})).map(([cat, produits]) => (
            <div key={cat} style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#666', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>{cat}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {produits.map(p => (
                  <div key={p.id} onClick={() => setProduitEdite({ ...p, prix: String(p.prix), ingredients: p.ingredients || [], supplements: p.supplements || [] })}
                    style={{ background: '#FFF', borderRadius: 10, padding: '12px 16px', border: `0.5px solid ${BORDER}`, display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }}>
                    {p.photoURL ? <img src={p.photoURL} alt="" style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover' }} /> : <div style={{ width: 44, height: 44, borderRadius: 8, background: CREME2, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>{p.emoji}</div>}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 500, color: '#1a1a1a' }}>{p.nom}</div>
                      <div style={{ fontSize: 12, color: '#999', marginTop: 2 }}>{p.prix?.toFixed ? p.prix.toFixed(2) : p.prix} TND — {p.type}</div>
                    </div>
                    <div style={{ fontSize: 11, padding: '3px 8px', borderRadius: 20, background: p.actif ? '#DCFCE7' : '#F3F4F6', color: p.actif ? '#166534' : '#999', fontWeight: 500 }}>{p.actif ? 'Actif' : 'Inactif'}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {vue === 'menu' && produitEdite && (() => {
        const champ = (label, key, type = 'text') => (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>{label}</div>
            <input type={type} value={produitEdite[key]} onChange={e => setProduitEdite(p => ({ ...p, [key]: e.target.value }))}
              style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: `0.5px solid #DDD`, fontSize: 13, boxSizing: 'border-box' }} />
          </div>
        );
        return (
          <div style={{ padding: 24, maxWidth: 640 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <button onClick={() => setProduitEdite(null)} style={{ padding: '6px 12px', borderRadius: 6, border: `0.5px solid #DDD`, background: CREME, color: '#666', cursor: 'pointer', fontSize: 12 }}>← Retour</button>
              <h2 style={{ fontSize: 16, fontWeight: 500, color: '#1a1a1a', margin: 0 }}>{produitEdite.nom || 'Nouveau produit'}</h2>
            </div>
            {champ('Nom', 'nom')}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Prix (TND)</div>
                <input type="number" step="0.5" value={produitEdite.prix} onChange={e => setProduitEdite(p => ({ ...p, prix: e.target.value }))}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: `0.5px solid #DDD`, fontSize: 13, boxSizing: 'border-box' }} />
              </div>
              <div>
                <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Emoji</div>
                <input value={produitEdite.emoji} onChange={e => setProduitEdite(p => ({ ...p, emoji: e.target.value }))}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: `0.5px solid #DDD`, fontSize: 18, boxSizing: 'border-box' }} />
              </div>
              <div>
                <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Type</div>
                <select value={produitEdite.type} onChange={e => setProduitEdite(p => ({ ...p, type: e.target.value }))}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: `0.5px solid #DDD`, fontSize: 13, boxSizing: 'border-box', background: '#FFF' }}>
                  <option value="boisson">Ajout direct (pas de popup)</option>
                  <option value="popup">Fiche descriptive (provenance, composition)</option>
                  <option value="sale">Fiche avec options (ingrédients + suppléments)</option>
                </select>
                <div style={{ fontSize: 11, color: '#aaa', marginTop: 4, lineHeight: 1.4 }}>Détermine comment le produit s'affiche au clic dans le menu client</div>
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Catégorie</div>
              <select value={produitEdite.categorie} onChange={e => setProduitEdite(p => ({ ...p, categorie: e.target.value }))}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: `0.5px solid #DDD`, fontSize: 13, boxSizing: 'border-box', background: '#FFF' }}>
                <option value="">— Choisir —</option>
                <option value="Boissons">Boissons</option>
                <option value="Sans+">Sans+</option>
                <option value="Pâtisseries">Pâtisseries</option>
                <option value="Salé">Salé</option>
              </select>
            </div>
            {champ('Description', 'description')}
            {champ('Provenance', 'provenance')}
            {champ('Composition', 'composition')}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>Ingrédients</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                {produitEdite.ingredients.map((ing, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, background: CREME2, borderRadius: 20, padding: '4px 10px', fontSize: 12 }}>
                    {ing}
                    <span onClick={() => setProduitEdite(p => ({ ...p, ingredients: p.ingredients.filter((_, j) => j !== i) }))} style={{ cursor: 'pointer', color: '#999', fontWeight: 500, marginLeft: 2 }}>×</span>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input value={nouvelIngredient} onChange={e => setNouvelIngredient(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && nouvelIngredient.trim()) { setProduitEdite(p => ({ ...p, ingredients: [...p.ingredients, nouvelIngredient.trim()] })); setNouvelIngredient(''); } }}
                  placeholder="Ajouter un ingrédient…" style={{ flex: 1, padding: '7px 12px', borderRadius: 8, border: `0.5px solid #DDD`, fontSize: 13 }} />
                <button onClick={() => { if (nouvelIngredient.trim()) { setProduitEdite(p => ({ ...p, ingredients: [...p.ingredients, nouvelIngredient.trim()] })); setNouvelIngredient(''); } }}
                  style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: '#1a1a1a', color: '#FFF', cursor: 'pointer', fontSize: 13 }}>+</button>
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>Suppléments</div>
              {produitEdite.supplements.map((s, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ flex: 1, fontSize: 13 }}>{s.nom}</span>
                  <span style={{ fontSize: 13, color: '#718096', fontWeight: 500 }}>+{Number(s.prix).toFixed(2)} TND</span>
                  <span onClick={() => setProduitEdite(p => ({ ...p, supplements: p.supplements.filter((_, j) => j !== i) }))} style={{ cursor: 'pointer', color: '#999', fontSize: 16, fontWeight: 500 }}>×</span>
                </div>
              ))}
              <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                <input value={nouveauSupNom} onChange={e => setNouveauSupNom(e.target.value)} placeholder="Nom du supplément" style={{ flex: 2, padding: '7px 12px', borderRadius: 8, border: `0.5px solid #DDD`, fontSize: 13 }} />
                <input type="number" step="0.5" value={nouveauSupPrix} onChange={e => setNouveauSupPrix(e.target.value)} placeholder="Prix" style={{ flex: 1, padding: '7px 12px', borderRadius: 8, border: `0.5px solid #DDD`, fontSize: 13 }} />
                <button onClick={() => { if (nouveauSupNom.trim() && nouveauSupPrix !== '') { setProduitEdite(p => ({ ...p, supplements: [...p.supplements, { nom: nouveauSupNom.trim(), prix: Number(nouveauSupPrix) }] })); setNouveauSupNom(''); setNouveauSupPrix(''); } }}
                  style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: '#1a1a1a', color: '#FFF', cursor: 'pointer', fontSize: 13 }}>+</button>
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>Photo</div>
              {produitEdite.photoURL && <img src={produitEdite.photoURL} alt="" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8, marginBottom: 8, display: 'block' }} />}
              <input type="file" accept="image/*" onChange={async e => {
                const file = e.target.files[0];
                if (!file) return;
                setPhotoUploading(true);
                const formData = new FormData();
                formData.append('key', '827a405be502f40ef803234542b1e00d');
                formData.append('image', file);
                const res = await fetch('https://api.imgbb.com/1/upload', { method: 'POST', body: formData });
                const json = await res.json();
                setProduitEdite(p => ({ ...p, photoURL: json.data.url }));
                setPhotoUploading(false);
              }} style={{ fontSize: 13 }} />
              {photoUploading && <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>Upload en cours…</div>}
            </div>
            <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ fontSize: 12, color: '#666' }}>Actif</div>
              <div onClick={() => setProduitEdite(p => ({ ...p, actif: !p.actif }))}
                style={{ width: 40, height: 22, borderRadius: 11, background: produitEdite.actif ? '#166534' : '#DDD', cursor: 'pointer', position: 'relative', transition: 'background 0.2s' }}>
                <div style={{ position: 'absolute', top: 3, left: produitEdite.actif ? 20 : 3, width: 16, height: 16, borderRadius: '50%', background: '#FFF', transition: 'left 0.2s' }} />
              </div>
              <span style={{ fontSize: 12, color: produitEdite.actif ? '#166534' : '#999' }}>{produitEdite.actif ? 'Visible dans le menu' : 'Masqué'}</span>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={async () => {
                const { id, ...data } = produitEdite;
                await setDoc(doc(db, 'menu', id), { ...data, prix: Number(data.prix) });
                setProduitEdite(null);
              }} style={{ flex: 1, padding: '12px', borderRadius: 8, border: 'none', background: '#1a1a1a', color: '#FFF', cursor: 'pointer', fontSize: 14, fontWeight: 500 }}>
                Enregistrer
              </button>
              {menuProduits.find(p => p.id === produitEdite.id) && (
                <button onClick={async () => {
                  if (window.confirm(`Supprimer "${produitEdite.nom}" ?`)) {
                    await deleteDoc(doc(db, 'menu', produitEdite.id));
                    setProduitEdite(null);
                  }
                }} style={{ padding: '12px 18px', borderRadius: 8, border: 'none', background: '#EF4444', color: '#FFF', cursor: 'pointer', fontSize: 14 }}>
                  Supprimer
                </button>
              )}
            </div>
          </div>
        );
      })()}

      {/* POPUP MODIFIER COMMANDE */}
      {commandeSelectee && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#FFF', borderRadius: 12, padding: 24, width: 500, maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 500, color: '#1a1a1a', margin: 0 }}>Modifier — Table {commandeSelectee.table}</h3>
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
                  <span style={{ fontWeight: 500, minWidth: 16, textAlign: 'center' }}>{p.quantite}</span>
                  <button onClick={() => ajouterArticle(commandeSelectee, p, false)} style={{ width: 26, height: 26, borderRadius: '50%', border: 'none', background: '#1a1a1a', color: '#FFF', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                  <button onClick={() => supprimerArticle(commandeSelectee, i)} style={{ background: 'none', border: 'none', color: '#EF4444', fontSize: 16, cursor: 'pointer', padding: '0 4px' }}>✕</button>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0 0', fontWeight: 500, fontSize: 15, color: '#1A202C' }}>
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
              style={{ width: '100%', padding: '12px', borderRadius: 8, border: 'none', background: '#1A202C', color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 500 }}>
              {modifie ? '✓ Modifications enregistrées — Fermer' : 'Fermer'}
            </button>
          </div>
        </div>
      )}

      {/* TABLES & QR CODES */}
      {vue === 'tables' && (
        <div style={{ padding: 24, maxWidth: 1000 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 500, color: '#1a1a1a', margin: '0 0 4px' }}>Tables & QR Codes</h2>
              <p style={{ fontSize: 13, color: '#888', margin: 0 }}>Imprimez le QR code de chaque table pour le déposer sur la table.</p>
            </div>
            <button onClick={ajouterTable}
              style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#1A202C', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 500, flexShrink: 0 }}>
              + Ajouter une table
            </button>
          </div>
          {tablesQR.length === 0 && <div style={{ textAlign: 'center', marginTop: 60, color: '#999' }}>Chargement…</div>}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            <style>{`@media(max-width:900px){.qr-tables-grid{grid-template-columns:repeat(2,1fr)!important}}@media(max-width:560px){.qr-tables-grid{grid-template-columns:1fr!important}}`}</style>
            {tablesQR.map(table => {
              const url = `https://qresto-ten.vercel.app?table=${table}`;
              const imprimer = () => {
                const canvas = document.getElementById(`qr-canvas-table-${table}`);
                const dataUrl = canvas ? canvas.toDataURL('image/png') : null;
                const w = window.open('', '_blank');
                w.document.write(`<!DOCTYPE html><html><head><title>Table ${table}</title><style>
                  *{margin:0;padding:0;box-sizing:border-box}
                  body{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',sans-serif;background:#fff}
                  img{width:300px;height:300px;margin-bottom:24px}
                  h1{font-size:32px;font-weight:700;color:#1a1a1a;margin-bottom:10px;letter-spacing:-0.5px}
                  p{font-size:14px;color:#888;letter-spacing:0.2px}
                  @media print{@page{margin:20mm}body{justify-content:center}}
                </style></head><body>
                  ${dataUrl ? `<img src="${dataUrl}" />` : ''}
                  <h1>Table ${table}</h1>
                  <p>La Pâtisserie d'Inès × Sans+</p>
                  <script>window.onload=()=>setTimeout(()=>window.print(),300);<\/script>
                </body></html>`);
                w.document.close();
              };
              return (
                <div key={table} style={{ background: '#FFF', borderRadius: 12, padding: '24px 20px', border: '0.5px solid #E2E8F0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, position: 'relative' }}>
                  <button onClick={() => supprimerTable(table)}
                    title={`Supprimer Table ${table}`}
                    onMouseEnter={e => e.currentTarget.querySelector('i').style.color = '#DC2626'}
                    onMouseLeave={e => e.currentTarget.querySelector('i').style.color = '#999'}
                    style={{ position: 'absolute', top: 10, right: 10, background: 'transparent', border: '0.5px solid #E2E8F0', borderRadius: 6, padding: '6px 8px', cursor: 'pointer', transition: 'all 0.15s ease', display: 'flex', alignItems: 'center' }}>
                    <i className="ti ti-trash" style={{ fontSize: 16, color: '#999', transition: 'color 0.15s ease' }} />
                  </button>
                  <QRCodeCanvas
                    id={`qr-canvas-table-${table}`}
                    value={url}
                    size={200}
                    bgColor="#ffffff"
                    fgColor="#1a1a1a"
                    level="M"
                  />
                  <div style={{ fontSize: 18, fontWeight: 600, color: '#1a1a1a' }}>Table {table}</div>
                  <div style={{ fontSize: 11, color: '#999', textAlign: 'center' }}>La Pâtisserie d'Inès × Sans+</div>
                  <button onClick={imprimer}
                    style={{ padding: '7px 18px', borderRadius: 8, border: '0.5px solid #E2E8F0', background: '#F9F9F9', color: '#333', cursor: 'pointer', fontSize: 12, fontWeight: 500 }}>
                    Imprimer
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODAL NOUVELLE COMMANDE */}
      {showNouvelleCommande && (
        <div onClick={ncFermer}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '24px 16px', overflowY: 'auto' }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: '#FFF', borderRadius: 14, width: '100%', maxWidth: 560, display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.18)', border: '0.5px solid #E2E8F0', maxHeight: 'calc(100vh - 48px)', overflow: 'hidden' }}>

            {/* Header */}
            <div style={{ padding: '14px 20px', borderBottom: '0.5px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <h2 style={{ margin: 0, fontSize: 15, fontWeight: 500, color: '#1a1a1a' }}>
                {ncConfig ? `← ${ncConfig.produit.nom}` : 'Nouvelle commande'}
              </h2>
              <button onClick={ncConfig ? () => setNcConfig(null) : ncFermer}
                style={{ background: 'none', border: 'none', fontSize: 20, color: '#999', cursor: 'pointer', padding: '0 4px', lineHeight: 1 }}>
                {ncConfig ? '←' : '✕'}
              </button>
            </div>

            {/* Table select (masqué en mode config) */}
            {!ncConfig && (
              <div style={{ padding: '12px 20px', borderBottom: '0.5px solid #F0F0F0', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 12, color: '#666', flexShrink: 0 }}>Table</span>
                <select value={ncTable} onChange={e => setNcTable(Number(e.target.value))}
                  style={{ padding: '7px 12px', borderRadius: 8, border: '0.5px solid #DDD', fontSize: 13, background: '#FFF', flex: 1, maxWidth: 160 }}>
                  {Array.from({ length: 20 }, (_, i) => i + 1).map(n => (
                    <option key={n} value={n}>Table {n}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Contenu scrollable */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '14px 20px' }}>

              {/* CONFIG PRODUIT SALÉ */}
              {ncConfig && (() => {
                const { produit, supplementsChoisis, ingredientsRetires } = ncConfig;
                return (
                  <div>
                    <div style={{ background: '#F9F9F9', borderRadius: 10, padding: '12px 14px', marginBottom: 16, border: '0.5px solid #E5E5E5' }}>
                      <div style={{ fontSize: 15, fontWeight: 500 }}>{produit.emoji} {produit.nom}</div>
                      <div style={{ fontSize: 13, color: '#999', marginTop: 2 }}>{produit.prix.toFixed(2)} TND</div>
                    </div>

                    {produit.supplements?.length > 0 && (
                      <div style={{ marginBottom: 16 }}>
                        <div style={{ fontSize: 11, color: '#999', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>Suppléments</div>
                        {produit.supplements.map((s, i) => {
                          const checked = supplementsChoisis.includes(s.nom);
                          return (
                            <div key={i} onClick={() => setNcConfig(prev => ({
                              ...prev,
                              supplementsChoisis: checked
                                ? prev.supplementsChoisis.filter(x => x !== s.nom)
                                : [...prev.supplementsChoisis, s.nom]
                            }))} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 12px', borderRadius: 8, marginBottom: 4, border: `0.5px solid ${checked ? '#3182CE' : '#E5E5E5'}`, background: checked ? 'rgba(99,179,237,0.08)' : '#FAFAFA', cursor: 'pointer' }}>
                              <span style={{ fontSize: 13, color: checked ? '#2B6CB0' : '#333', fontWeight: checked ? 500 : 400 }}>{s.nom}</span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <span style={{ fontSize: 12, color: '#999' }}>+{Number(s.prix).toFixed(2)} TND</span>
                                <div style={{ width: 16, height: 16, borderRadius: 4, border: `1.5px solid ${checked ? '#3182CE' : '#CBD5E0'}`, background: checked ? '#3182CE' : '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  {checked && <span style={{ color: '#FFF', fontSize: 10, lineHeight: 1 }}>✓</span>}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {produit.ingredients?.length > 0 && (
                      <div style={{ marginBottom: 16 }}>
                        <div style={{ fontSize: 11, color: '#999', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>Retirer des ingrédients</div>
                        {produit.ingredients.map((ing, i) => {
                          const checked = ingredientsRetires.includes(ing);
                          return (
                            <div key={i} onClick={() => setNcConfig(prev => ({
                              ...prev,
                              ingredientsRetires: checked
                                ? prev.ingredientsRetires.filter(x => x !== ing)
                                : [...prev.ingredientsRetires, ing]
                            }))} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 12px', borderRadius: 8, marginBottom: 4, border: `0.5px solid ${checked ? '#EF4444' : '#E5E5E5'}`, background: checked ? 'rgba(239,68,68,0.05)' : '#FAFAFA', cursor: 'pointer' }}>
                              <span style={{ fontSize: 13, color: checked ? '#EF4444' : '#333', textDecoration: checked ? 'line-through' : 'none' }}>{ing}</span>
                              <div style={{ width: 16, height: 16, borderRadius: 4, border: `1.5px solid ${checked ? '#EF4444' : '#CBD5E0'}`, background: checked ? '#EF4444' : '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {checked && <span style={{ color: '#FFF', fontSize: 10, lineHeight: 1 }}>✕</span>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <button onClick={() => {
                      ncAjouter(ncConfig.produit, ncConfig.supplementsChoisis, ncConfig.ingredientsRetires);
                      setNcConfig(null);
                    }} style={{ width: '100%', padding: 12, borderRadius: 8, border: 'none', background: '#1A202C', color: '#FFF', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
                      Ajouter au panier
                    </button>
                  </div>
                );
              })()}

              {/* LISTE DES PRODUITS PAR CATÉGORIE */}
              {!ncConfig && (() => {
                const actifs = menuProduits.filter(p => p.actif);
                const parCat = actifs.reduce((acc, p) => { (acc[p.categorie] = acc[p.categorie] || []).push(p); return acc; }, {});
                return Object.entries(parCat).map(([cat, produits]) => (
                  <div key={cat} style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 11, color: '#999', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>{cat}</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      {produits.map(produit => (
                        <div key={produit.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderRadius: 8, background: '#F9F9F9', border: '0.5px solid #E5E5E5' }}>
                          <div>
                            <span style={{ fontSize: 13, fontWeight: 500, color: '#1a1a1a' }}>{produit.emoji} {produit.nom}</span>
                            <span style={{ fontSize: 12, color: '#999', marginLeft: 8 }}>{Number(produit.prix).toFixed(2)} TND</span>
                          </div>
                          <button onClick={() => {
                            if (produit.type === 'sale') {
                              setNcConfig({ produit, supplementsChoisis: [], ingredientsRetires: [] });
                            } else {
                              ncAjouter(produit);
                            }
                          }} style={{ width: 28, height: 28, borderRadius: '50%', border: 'none', background: '#1A202C', color: '#FFF', cursor: 'pointer', fontSize: 17, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>+</button>
                        </div>
                      ))}
                    </div>
                  </div>
                ));
              })()}
            </div>

            {/* RÉCAPITULATIF PANIER */}
            {ncPanier.length > 0 && (
              <div style={{ borderTop: '0.5px solid #E2E8F0', padding: '14px 20px', flexShrink: 0, background: '#FAFAFA' }}>
                <div style={{ fontSize: 11, color: '#999', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>Récapitulatif</div>
                {ncPanier.map((p, i) => (
                  <div key={i} style={{ marginBottom: 3 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#333' }}>
                      <span>
                        {p.quantite}× {p.nom}
                        <button onClick={() => setNcPanier(prev => prev.filter((_, j) => j !== i))}
                          style={{ background: 'none', border: 'none', color: '#CCC', cursor: 'pointer', fontSize: 13, padding: '0 4px', marginLeft: 4 }}>✕</button>
                      </span>
                      <span style={{ color: '#999' }}>{(p.prix * p.quantite).toFixed(2)} TND</span>
                    </div>
                    {p.supplementsChoisis?.length > 0 && <div style={{ fontSize: 10, color: '#166534', marginLeft: 16 }}>+ {p.supplementsChoisis.join(', ')}</div>}
                    {p.ingredientsRetires?.length > 0 && <div style={{ fontSize: 10, color: '#EF4444', marginLeft: 16 }}>✕ Sans : {p.ingredientsRetires.join(', ')}</div>}
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 500, borderTop: '0.5px solid #E5E5E5', paddingTop: 8, marginTop: 8, marginBottom: 12 }}>
                  <span>Total</span>
                  <span>{ncPanier.reduce((acc, p) => acc + p.prix * p.quantite, 0).toFixed(2)} TND</span>
                </div>
                <button onClick={ncEnvoyer}
                  style={{ width: '100%', padding: 12, borderRadius: 8, border: 'none', background: '#1A202C', color: '#FFF', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
                  Envoyer — Table {ncTable}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      </div>{/* fin MAIN CONTENT */}
      {/* BOTTOM NAV — visible uniquement sur mobile/tablette via CSS */}
      <div className="qr-bottom-nav" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: 56, background: '#0B1220', zIndex: 20, borderTop: '0.5px solid rgba(255,255,255,0.08)', alignItems: 'stretch' }}>
        {[
          { key: 'commandes', label: 'Commandes', icon: 'ti-receipt' },
          { key: 'additions', label: 'Additions', icon: 'ti-cash' },
          { key: 'stocks', label: 'Stocks', icon: 'ti-package' },
          { key: 'menu', label: 'Menu', icon: 'ti-tool' },
          { key: 'stats', label: 'Stats', icon: 'ti-chart-bar' },
        ].map(item => {
          const actif = vue === item.key;
          return (
            <button key={item.key} onClick={() => setVue(item.key)}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, border: 'none', background: 'none', cursor: 'pointer', color: actif ? '#63B3ED' : 'rgba(255,255,255,0.45)' }}>
              <div style={{ position: 'relative' }}>
                <i className={`ti ${item.icon}`} style={{ fontSize: 19 }} />
                {item.key === 'commandes' && nbAttente > 0 && (
                  <span style={{ position: 'absolute', top: -4, right: -6, background: '#E24B4A', color: '#fff', borderRadius: '50%', width: 14, height: 14, fontSize: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 500 }}>
                    {nbAttente > 9 ? '9+' : nbAttente}
                  </span>
                )}
              </div>
              <span style={{ fontSize: 9, fontWeight: actif ? 500 : 400 }}>{item.label}</span>
            </button>
          );
        })}
      </div>

    </div>
  );
}

export default Dashboard;
