import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, onSnapshot, doc, updateDoc, addDoc, serverTimestamp, deleteDoc, setDoc } from 'firebase/firestore';
import * as XLSX from 'xlsx';
import { migrerMenuVersFirestore } from './migrerMenu';

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

function DashboardNew() {
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
  const [migrationStatus, setMigrationStatus] = useState('');
  const [modifie, setModifie] = useState(false);
  const [paiementsTable, setPaiementsTable] = useState({});
  const [articleActif, setArticleActif] = useState(null);
  const [montantArticle, setMontantArticle] = useState('');
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
  const [hoveredArticle, setHoveredArticle] = useState(null);
  const [tableAccordionOuvert, setTableAccordionOuvert] = useState(null);

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
    const unsub = onSnapshot(collection(db, 'menu'), (snap) => {
      setMenuProduits(snap.docs.map(d => ({ ...d.data(), id: d.id })).sort((a, b) => Number(a.id) - Number(b.id)));
    });
    return () => unsub();
  }, []);

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

  const payerTout = (table, mode) => {
    const reste = resteAPayer(table);
    if (reste <= 0) return;
    const heure = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const cmdsTable = commandes.filter(c => c.table === table);
    const nouveauxPaiements = [];
    cmdsTable.forEach(cmd => {
      (cmd.produits || []).forEach((p, idx) => {
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
          .qr-payer-btns button { flex: 1; font-size: 12px !important; padding: 10px !important; white-space: nowrap !important; text-align: center !important; }
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
                {item.key === 'suppressions' && corbeille.length > 0 && (
                  <span style={{ background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.7)', borderRadius: 10, fontSize: 10, fontWeight: 500, padding: '1px 6px' }}>{corbeille.length}</span>
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
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#48BB78' }} />
              <span style={{ fontSize: 12, color: '#48BB78', fontWeight: 500 }}>Live</span>
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
      {vue === 'suppressions' && (
        <div style={{ padding: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 500, color: '#1a1a1a', marginBottom: 4 }}>Commandes supprimées</h2>
          <p style={{ fontSize: 13, color: '#888', marginBottom: 20 }}>Les 10 dernières suppressions.</p>
          {corbeille.length === 0 ? <div style={{ textAlign: 'center', marginTop: 60, color: '#999' }}>Aucune suppression récente</div> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {corbeille.map((cmd, i) => (
                <div key={i} style={{ background: '#FFF', borderRadius: 10, overflow: 'hidden', border: `0.5px solid ${BORDER}` }}>
                  <div style={{ padding: '10px 16px', borderBottom: `0.5px solid #F0F0F0`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FFF8F8' }}>
                    <div><span style={{ fontWeight: 500 }}>Table {cmd.table}</span><span style={{ fontSize: 12, color: '#999', marginLeft: 8 }}>Supprimée à {cmd.supprimeLe}</span></div>
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
                  <div style={{ padding: '10px 16px' }}><span style={{ fontWeight: 500, fontSize: 14, color: '#1A202C' }}>{cmd.total?.toFixed(2)} TND</span></div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ADDITIONS */}
      {vue === 'additions' && (
        <div className="qr-additions-outer" style={{ padding: 24, maxWidth: 1200 }}>
          <h2 style={{ fontSize: 16, fontWeight: 500, color: '#1a1a1a', marginBottom: 4 }}>Additions par table</h2>
          <p style={{ fontSize: 13, color: '#888', marginBottom: 20 }}>Cliquez sur un article pour le payer — partiellement ou en entier.</p>
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
                        Tout payer — Espèces ({reste.toFixed(2)} TND)
                      </button>
                      <button onClick={() => payerTout(table, 'carte')}
                        style={{ flex: 1, padding: '8px', borderRadius: 8, border: '0.5px solid #CBD5E0', background: 'transparent', color: '#718096', cursor: 'pointer', fontSize: 12, fontWeight: 500 }}>
                        Tout payer — Carte
                      </button>
                    </div>
                  )}
                  <div style={{ padding: '10px 14px', borderBottom: `0.5px solid #F0F0F0` }}>
                    {!enModif && <div style={{ fontSize: 11, color: '#999', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Cliquez un article pour payer</div>}
                    {enModif && <div style={{ fontSize: 11, color: '#718096', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Mode modification</div>}
                    {cmds.map((cmd, i) => (
                      <div key={cmd.id} style={{ marginBottom: i < cmds.length - 1 ? 8 : 0 }}>
                        <div style={{ fontSize: 11, color: '#999', marginBottom: 3 }}>Commande {i + 1} — {formatHeure(cmd.heure)}</div>
                        {cmd.produits?.map((p, j) => {
                          const dejaPayePourCetArticle = montantDejaPayeArticle(table, cmd.id, j);
                          const prixArticle = p.prix * p.quantite;
                          const resteArticle = Math.max(0, prixArticle - dejaPayePourCetArticle);
                          const estActif = articleActif?.cmdId === cmd.id && articleActif?.idx === j;
                          const estPayeTotal = dejaPayePourCetArticle >= prixArticle;
                          const articleKey = `${cmd.id}-${j}`;
                          const isHov = hoveredArticle === articleKey && !estPayeTotal && !enModif;
                          return (
                            <div key={j} style={{ marginBottom: 4 }}>
                              <div
                                onClick={() => { if (enModif) return; if (estActif) { setArticleActif(null); setMontantArticle(''); return; } setArticleActif({ table, cmdId: cmd.id, idx: j, montantMax: resteArticle }); setMontantArticle(resteArticle.toFixed(2)); }}
                                onMouseEnter={() => { if (!estPayeTotal && !enModif) setHoveredArticle(articleKey); }}
                                onMouseLeave={() => setHoveredArticle(null)}
                                style={{
                                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                  fontSize: 13, padding: '7px 10px', borderRadius: 6,
                                  cursor: enModif ? 'default' : estPayeTotal ? 'default' : 'pointer',
                                  background: estPayeTotal ? '#F0F5F0' : estActif ? '#F7F8FA' : isHov ? 'rgba(49,130,206,0.06)' : '#F9F9F9',
                                  border: `0.5px solid ${estPayeTotal ? '#C0D9C0' : estActif ? '#C0C8D8' : '#E5E5E5'}`,
                                  borderLeft: isHov ? '2px solid #3182CE' : undefined,
                                  transition: 'all 0.15s ease',
                                }}>
                                <span style={{ flex: 1, color: estPayeTotal ? '#2D6A2D' : '#333' }}>
                                  {p.quantite}× {p.nom}
                                  {p.supplementsChoisis?.length > 0 && <span style={{ fontSize: 10, color: '#166534', marginLeft: 4 }}>+{Array.isArray(p.supplementsChoisis) ? p.supplementsChoisis.join(', ') : p.supplementsChoisis}</span>}
                                </span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  {dejaPayePourCetArticle > 0 && !estPayeTotal && (
                                    <span style={{ fontSize: 10, color: '#166534', background: '#DCFCE7', padding: '1px 6px', borderRadius: 10 }}>−{dejaPayePourCetArticle.toFixed(2)}</span>
                                  )}
                                  <span style={{ color: estPayeTotal ? '#2D6A2D' : '#333', fontWeight: estPayeTotal ? 500 : 400 }}>
                                    {estPayeTotal ? '✓ Payé' : `${resteArticle.toFixed(2)} TND`}
                                  </span>
                                  {enModif && (
                                    <button onClick={(e) => { e.stopPropagation(); supprimerArticleAddition(cmd.id, j); }}
                                      style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', fontSize: 16, padding: '0 2px', marginLeft: 4 }}>✕</button>
                                  )}
                                </div>
                              </div>
                              {estActif && !enModif && (
                                <div style={{ background: '#F7F8FA', borderRadius: '0 0 8px 8px', padding: '10px 12px', border: '0.5px solid #E2E8F0', borderTop: 'none', marginTop: -2 }}>
                                  <div style={{ fontSize: 11, color: '#718096', marginBottom: 8, fontWeight: 500 }}>Montant à encaisser pour "{p.nom}"</div>
                                  <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                                    <input value={montantArticle} onChange={e => setMontantArticle(e.target.value)} style={{ flex: 1, padding: '7px 10px', borderRadius: 6, border: '0.5px solid #CBD5E0', fontSize: 13, outline: 'none', MozAppearance: 'textfield' }} placeholder="Montant" />
                                    <button onClick={() => setMontantArticle((resteArticle / 2).toFixed(2))} style={{ padding: '7px 12px', borderRadius: 6, border: '0.5px solid #CBD5E0', background: '#FFF', color: '#718096', cursor: 'pointer', fontSize: 12, fontWeight: 500 }}>50%</button>
                                    <button onClick={() => setMontantArticle(resteArticle.toFixed(2))} style={{ padding: '7px 12px', borderRadius: 6, border: '0.5px solid #CBD5E0', background: '#FFF', color: '#718096', cursor: 'pointer', fontSize: 12, fontWeight: 500 }}>100%</button>
                                  </div>
                                  <div style={{ display: 'flex', gap: 6 }}>
                                    <button onClick={() => payerArticle(table, cmd.id, j, montantArticle, 'especes')} style={{ flex: 1, padding: '8px', borderRadius: 6, border: 'none', background: '#1A202C', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 500 }}>Espèces</button>
                                    <button onClick={() => payerArticle(table, cmd.id, j, montantArticle, 'carte')} style={{ flex: 1, padding: '8px', borderRadius: 6, border: '0.5px solid #CBD5E0', background: 'transparent', color: '#718096', cursor: 'pointer', fontSize: 12, fontWeight: 500 }}>Carte</button>
                                    <button onClick={() => { setArticleActif(null); setMontantArticle(''); }} style={{ padding: '8px 12px', borderRadius: 6, border: `0.5px solid #DDD`, background: '#FFF', color: '#666', cursor: 'pointer', fontSize: 12 }}>✕</button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
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
              <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
                <button onClick={async () => { setMigrationStatus('Migration en cours...'); await migrerMenuVersFirestore(); setMigrationStatus('✅ Terminé !'); }}
                  style={{ padding: '8px 14px', borderRadius: 8, border: `0.5px solid #DDD`, background: '#FFF', color: '#1a1a1a', cursor: 'pointer', fontSize: 13 }}>
                  Migrer menu vers Firestore
                </button>
                {migrationStatus && <span style={{ fontSize: 13, color: '#666' }}>{migrationStatus}</span>}
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
                  <option value="boisson">boisson</option>
                  <option value="popup">popup</option>
                  <option value="sale">sale</option>
                </select>
              </div>
            </div>
            {champ('Catégorie', 'categorie')}
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

export default DashboardNew;
