"use client";

import { useEffect } from "react";

const textMap: Record<string, string> = {
  "Beranda": "Home",
  "Dasbor": "Dashboard",
  "Acara": "Events",
  "Penyelenggara": "Organizer",
  "Peserta": "Attendees",
  "Pengaturan": "Settings",
  "Keluar": "Sign out",
  "Masuk": "Sign in",
  "Daftar": "Create account",
  "Simpan": "Save changes",
  "Batal": "Cancel",
  "Hapus": "Delete",
  "Edit": "Edit",
  "Cari": "Search",
  "Tambah": "Add",
  "Buat Event": "Create event",
  "Kelola Event": "Manage event",
  "Lihat Detail": "View details",
  "Belum ada data": "No data yet",
  "Belum ada event": "No events yet",
  "Tidak ada hasil": "No results found",
  "Nama": "Name",
  "Email": "Email",
  "Nomor Telepon": "Phone number",
  "Lokasi": "Location",
  "Tanggal": "Date",
  "Deskripsi": "Description",
  "Catatan": "Notes",
  "Status": "Status",
  "Akses": "Access",
  "Pindai": "Scan",
  "Scanner": "Scanner",
};

const placeholderMap: Record<string, string> = {
  "Cari event": "Search events by name or location",
  "Cari acara": "Search events by name or location",
  "Cari peserta": "Search attendees by name, email, or pass ID",
  "Masukkan nama": "Enter full name",
  "Masukkan nama event": "Enter a clear event name",
  "Nama event": "e.g. PassFlow Community Summit 2026",
  "Masukkan email": "name@company.com",
  "Email": "name@company.com",
  "Nomor telepon": "e.g. +62 812 3456 7890",
  "Masukkan lokasi": "Enter venue or city",
  "Lokasi event": "e.g. Jakarta Convention Center",
  "Masukkan deskripsi": "Add a concise description for attendees",
  "Deskripsi": "Add a concise description for attendees",
  "Catatan": "Add internal notes for your team",
  "Cari": "Search by name, email, ID, or keyword",
};

function polish(root: ParentNode) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];

  while (walker.nextNode()) nodes.push(walker.currentNode as Text);

  for (const node of nodes) {
    const value = node.nodeValue?.trim();
    if (!value || !textMap[value]) continue;
    const leading = node.nodeValue?.match(/^\s*/)?.[0] ?? "";
    const trailing = node.nodeValue?.match(/\s*$/)?.[0] ?? "";
    node.nodeValue = `${leading}${textMap[value]}${trailing}`;
  }

  if ("querySelectorAll" in root) {
    root.querySelectorAll?.("input[placeholder], textarea[placeholder]").forEach((element) => {
      const field = element as HTMLInputElement | HTMLTextAreaElement;
      const current = field.placeholder.trim();
      if (placeholderMap[current]) field.placeholder = placeholderMap[current];
    });
  }
}

export default function LanguagePolish() {
  useEffect(() => {
    document.documentElement.lang = "en";
    polish(document.body);

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) polish(node as Element);
          if (node.nodeType === Node.TEXT_NODE && node.parentNode) polish(node.parentNode);
        }
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return null;
}
