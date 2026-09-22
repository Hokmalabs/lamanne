"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { apiPost, apiPatch, ApiClientError } from "@/lib/api-client";
import { formatCFA } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle, Minus, Plus, Upload, X } from "lucide-react";

const TRANCHES_OPTIONS = [1, 2, 3, 6, 10, 12];
const MAX_IMAGES = 4;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 Mo — aligné sur la policy du bucket
const DELIVERY_MIN = 1;
const DELIVERY_MAX = 30;

// Extension déduite du type MIME, jamais du nom de fichier (qui n'est pas fiable)
const MIME_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};
const ACCEPT_ATTR = "image/jpeg,image/png,image/webp,image/gif";

export type ProductFormInitial = {
  name: string;
  description: string;
  price: number;
  category_id: string | null;
  stock: number;
  is_lot: boolean;
  lot_details: string | null;
  min_tranches: number;
  max_tranches: number;
  delivery_days: number;
  is_active: boolean;
  images: string[];
};

export type ProductFormProps =
  | { mode: "create" }
  | { mode: "edit"; productId: string; initial: ProductFormInitial };

type CategoryOption = { id: string; name: string };

type NewPhoto = { file: File; previewUrl: string };

type FormState = {
  name: string;
  description: string;
  price: string;
  category_id: string;
  stock: string;
  is_lot: boolean;
  lot_details: string;
  min_tranches: number;
  max_tranches: number;
  delivery_days: number;
  is_active: boolean;
};

const fieldClass =
  "w-full min-h-[44px] rounded-lg border border-gray-200 bg-white px-4 py-2 text-base sm:text-sm text-gray-900 placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lamanne-accent focus-visible:border-transparent transition-all";

/** Entier positif à partir d'une saisie libre (espaces tolérés), null si invalide. */
function toInt(value: string): number | null {
  const cleaned = value.replace(/\s/g, "");
  if (!/^\d+$/.test(cleaned)) return null;
  return parseInt(cleaned, 10);
}

function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] flex-shrink-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lamanne-accent"
    >
      <span
        className={`relative block w-12 h-7 rounded-full transition-colors ${
          checked ? "bg-lamanne-primary" : "bg-gray-300"
        }`}
      >
        <span
          className={`absolute top-1 h-5 w-5 bg-white rounded-full shadow transition-transform ${
            checked ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </span>
    </button>
  );
}

export default function ProductForm(props: ProductFormProps) {
  const router = useRouter();
  const isEdit = props.mode === "edit";
  const initial = props.mode === "edit" ? props.initial : null;

  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [form, setForm] = useState<FormState>(() => ({
    name: initial?.name ?? "",
    description: initial?.description ?? "",
    price: initial ? String(initial.price) : "",
    category_id: initial?.category_id ?? "",
    stock: initial ? String(initial.stock) : "1",
    is_lot: initial?.is_lot ?? false,
    lot_details: initial?.lot_details ?? "",
    min_tranches: initial?.min_tranches ?? 1,
    max_tranches: initial?.max_tranches ?? 6,
    delivery_days: initial?.delivery_days ?? 1,
    is_active: initial?.is_active ?? true,
  }));
  const [existingImages, setExistingImages] = useState<string[]>(initial?.images ?? []);
  const [newPhotos, setNewPhotos] = useState<NewPhoto[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const errorRef = useRef<HTMLDivElement | null>(null);
  const newPhotosRef = useRef<NewPhoto[]>([]);

  // Chargement des catégories
  useEffect(() => {
    let cancelled = false;
    supabase
      .from("categories")
      .select("id, name")
      .order("name")
      .then(({ data, error: categoriesError }) => {
        if (cancelled) return;
        if (categoriesError) {
          setError("Impossible de charger les catégories.");
          return;
        }
        setCategories((data ?? []) as CategoryOption[]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Amener l'utilisateur sur le message d'erreur
  useEffect(() => {
    if (error) errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [error]);

  // Libération des aperçus au démontage
  useEffect(() => {
    newPhotosRef.current = newPhotos;
  }, [newPhotos]);
  useEffect(() => {
    return () => {
      for (const photo of newPhotosRef.current) URL.revokeObjectURL(photo.previewUrl);
    };
  }, []);

  const totalImages = existingImages.length + newPhotos.length;

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []);
    e.target.value = ""; // permet de resélectionner le même fichier
    if (selected.length === 0) return;

    setError(null);
    const accepted: NewPhoto[] = [];
    let remaining = MAX_IMAGES - totalImages;

    for (const file of selected) {
      if (!MIME_EXTENSIONS[file.type]) {
        setError(`${file.name} : format non accepté (JPEG, PNG, WebP ou GIF)`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        setError(`${file.name} : fichier trop lourd (5 Mo maximum)`);
        continue;
      }
      if (remaining <= 0) {
        setError(`Vous ne pouvez pas dépasser ${MAX_IMAGES} photos.`);
        break;
      }
      accepted.push({ file, previewUrl: URL.createObjectURL(file) });
      remaining -= 1;
    }

    if (accepted.length > 0) setNewPhotos((current) => [...current, ...accepted]);
  };

  const removeExistingImage = (index: number) => {
    // L'URL est retirée du tableau ; le fichier reste dans le Storage
    setExistingImages((current) => current.filter((_, i) => i !== index));
  };

  const removeNewPhoto = (index: number) => {
    setNewPhotos((current) => {
      const target = current[index];
      if (target) URL.revokeObjectURL(target.previewUrl);
      return current.filter((_, i) => i !== index);
    });
  };

  const validate = (): string | null => {
    if (form.name.trim().length < 2) return "Le nom doit contenir au moins 2 caractères.";
    const price = toInt(form.price);
    if (price === null || price <= 0) return "Le prix doit être un nombre entier supérieur à 0.";
    const stock = toInt(form.stock);
    if (stock === null) return "Le stock doit être un nombre entier positif ou nul.";
    if (!form.category_id) return "Veuillez choisir une catégorie.";
    if (form.min_tranches > form.max_tranches)
      return "La durée minimum ne peut pas dépasser la durée maximum.";
    return null;
  };

  // Suppression best effort des fichiers envoyés pendant cette soumission
  const cleanupUploads = async (paths: string[]) => {
    if (paths.length === 0) return;
    try {
      await supabase.storage.from("products").remove(paths);
    } catch {
      // best effort : on ne bloque pas l'utilisateur là-dessus
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);

    // Upload des nouvelles photos, après validation uniquement
    const uploadedPaths: string[] = [];
    const uploadedUrls: string[] = [];

    for (const photo of newPhotos) {
      const ext = MIME_EXTENSIONS[photo.file.type];
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("products")
        .upload(path, photo.file, { upsert: false, contentType: photo.file.type });

      if (uploadError) {
        await cleanupUploads(uploadedPaths);
        setError(
          `Échec de l'envoi de la photo ${photo.file.name}. Aucune modification enregistrée.`
        );
        setSaving(false);
        return;
      }

      uploadedPaths.push(path);
      const { data: urlData } = supabase.storage.from("products").getPublicUrl(path);
      uploadedUrls.push(urlData.publicUrl);
    }

    const images = [...existingImages, ...uploadedUrls];
    const payload = {
      name: form.name.trim(),
      description: form.description,
      price: toInt(form.price) as number,
      category_id: form.category_id,
      stock: toInt(form.stock) as number,
      is_lot: form.is_lot,
      lot_details: form.is_lot ? form.lot_details : null,
      min_tranches: form.min_tranches,
      max_tranches: form.max_tranches,
      delivery_days: form.delivery_days,
      images,
    };

    try {
      if (props.mode === "edit") {
        await apiPatch(`/api/admin/produits/${props.productId}`, {
          ...payload,
          is_active: form.is_active,
        });
      } else {
        await apiPost("/api/admin/produits", { ...payload, is_active: true });
      }
    } catch (e) {
      await cleanupUploads(uploadedPaths);
      const message = e instanceof ApiClientError ? e.message : "Erreur réseau";
      setError(message);
      setSaving(false);
      return;
    }

    router.push("/admin/produits");
  };

  const pricePreview = toInt(form.price);

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div
          ref={errorRef}
          role="alert"
          className="rounded-xl bg-lamanne-danger/10 text-lamanne-danger text-sm px-4 py-3"
        >
          {error}
        </div>
      )}

      {/* 1. Informations générales */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
        <h2 className="font-bold text-gray-900">Informations générales</h2>

        <div className="space-y-1.5">
          <Label htmlFor="name">Nom du produit *</Label>
          <Input
            id="name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="ex : Batterie de cuisine 12 pièces"
            className="min-h-[44px] text-base sm:text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="description">Description</Label>
          <textarea
            id="description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Description détaillée du produit…"
            rows={3}
            className={`${fieldClass} resize-none`}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="price">Prix (FCFA) *</Label>
            <Input
              id="price"
              type="text"
              inputMode="numeric"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              placeholder="850000"
              className="min-h-[44px] text-base sm:text-sm"
            />
            {pricePreview !== null && pricePreview > 0 && (
              <p className="text-xs text-gray-500">= {formatCFA(pricePreview)}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="stock">Stock disponible *</Label>
            <Input
              id="stock"
              type="text"
              inputMode="numeric"
              value={form.stock}
              onChange={(e) => setForm({ ...form, stock: e.target.value })}
              placeholder="1"
              className="min-h-[44px] text-base sm:text-sm"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="category">Catégorie *</Label>
          <select
            id="category"
            value={form.category_id}
            onChange={(e) => setForm({ ...form, category_id: e.target.value })}
            className={fieldClass}
          >
            <option value="">Sélectionner une catégorie</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        {isEdit && (
          <div className="flex items-center justify-between gap-3 pt-2 border-t border-gray-100">
            <div>
              <p className="text-sm font-semibold text-gray-700">
                Produit visible dans le catalogue
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Désactivez pour le masquer sans le supprimer
              </p>
            </div>
            <Switch
              checked={form.is_active}
              onChange={(next) => setForm({ ...form, is_active: next })}
              label="Produit visible dans le catalogue"
            />
          </div>
        )}
      </div>

      {/* 2. Type de produit */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-bold text-gray-900">Type de produit</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Activez si ce produit regroupe plusieurs articles
            </p>
          </div>
          <Switch
            checked={form.is_lot}
            onChange={(next) => setForm({ ...form, is_lot: next })}
            label="C'est un lot"
          />
        </div>

        {form.is_lot && (
          <div className="space-y-1.5">
            <Label htmlFor="lot_details">Détail du lot</Label>
            <textarea
              id="lot_details"
              value={form.lot_details}
              onChange={(e) => setForm({ ...form, lot_details: e.target.value })}
              placeholder={"1x Batterie de cuisine 12 pièces\n1x Mixeur & broyeur\n1x Set de couverts"}
              rows={4}
              className={`${fieldClass} resize-none`}
            />
            <p className="text-xs text-gray-500">Une ligne par article du lot</p>
          </div>
        )}
      </div>

      {/* 3. Durée de cotisation */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
        <h2 className="font-bold text-gray-900">Durée de cotisation</h2>

        <div className="space-y-2">
          <Label>Durée minimum</Label>
          <div className="flex gap-2 flex-wrap">
            {TRANCHES_OPTIONS.filter((n) => n <= form.max_tranches).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setForm({ ...form, min_tranches: n })}
                className={`inline-flex items-center min-h-[44px] px-4 rounded-full text-sm font-semibold border transition-colors ${
                  form.min_tranches === n
                    ? "bg-lamanne-primary text-white border-lamanne-primary"
                    : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                }`}
              >
                {n} mois
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Durée maximum</Label>
          <div className="flex gap-2 flex-wrap">
            {TRANCHES_OPTIONS.filter((n) => n >= form.min_tranches).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setForm({ ...form, max_tranches: n })}
                className={`inline-flex items-center min-h-[44px] px-4 rounded-full text-sm font-semibold border transition-colors ${
                  form.max_tranches === n
                    ? "bg-lamanne-primary text-white border-lamanne-primary"
                    : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                }`}
              >
                {n} mois
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 4. Délai de livraison */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
        <div>
          <h2 className="font-bold text-gray-900">Délai de livraison</h2>
          <p className="text-xs text-gray-500 mt-0.5">Jours après la fin de la cotisation</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="Diminuer"
            onClick={() =>
              setForm({ ...form, delivery_days: Math.max(DELIVERY_MIN, form.delivery_days - 1) })
            }
            disabled={form.delivery_days <= DELIVERY_MIN}
            className="h-11 w-11 flex-shrink-0 inline-flex items-center justify-center rounded-xl border border-gray-200 text-gray-600 hover:border-lamanne-primary disabled:opacity-40 transition-colors"
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="font-sora text-2xl font-black text-gray-900 w-12 text-center">
            {form.delivery_days}
          </span>
          <button
            type="button"
            aria-label="Augmenter"
            onClick={() =>
              setForm({ ...form, delivery_days: Math.min(DELIVERY_MAX, form.delivery_days + 1) })
            }
            disabled={form.delivery_days >= DELIVERY_MAX}
            className="h-11 w-11 flex-shrink-0 inline-flex items-center justify-center rounded-xl border border-gray-200 text-gray-600 hover:border-lamanne-primary disabled:opacity-40 transition-colors"
          >
            <Plus className="h-4 w-4" />
          </button>
          <span className="text-sm text-gray-500">
            jour{form.delivery_days > 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* 5. Photos */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
        <div>
          <h2 className="font-bold text-gray-900">Photos</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {MAX_IMAGES} photos maximum · JPEG, PNG, WebP ou GIF · 5 Mo par photo
          </p>
        </div>

        {totalImages > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {existingImages.map((url, index) => (
              <div key={url} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="w-full aspect-square rounded-xl object-cover" />
                <button
                  type="button"
                  aria-label="Retirer la photo"
                  onClick={() => removeExistingImage(index)}
                  className="absolute top-1 right-1 h-10 w-10 inline-flex items-center justify-center rounded-full bg-gray-900/70 text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
            {newPhotos.map((photo, index) => (
              <div key={photo.previewUrl} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.previewUrl}
                  alt=""
                  className="w-full aspect-square rounded-xl object-cover"
                />
                <button
                  type="button"
                  aria-label="Retirer la photo"
                  onClick={() => removeNewPhoto(index)}
                  className="absolute top-1 right-1 h-10 w-10 inline-flex items-center justify-center rounded-full bg-gray-900/70 text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {totalImages < MAX_IMAGES && (
          <label className="flex min-h-[88px] cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 px-4 hover:border-lamanne-accent transition-colors">
            <Upload className="h-5 w-5 text-gray-400" />
            <span className="text-sm text-gray-500">Ajouter des photos</span>
            <input
              type="file"
              accept={ACCEPT_ATTR}
              multiple
              className="hidden"
              onChange={handleFilesSelected}
            />
          </label>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-col-reverse gap-3 sm:flex-row">
        <Button asChild variant="outline" className="w-full sm:flex-1 min-h-[44px]">
          <Link href="/admin/produits">Annuler</Link>
        </Button>
        <Button type="submit" className="w-full sm:flex-1 min-h-[44px]" disabled={saving}>
          {saving ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Enregistrement…
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              {isEdit ? "Enregistrer les modifications" : "Enregistrer le produit"}
            </span>
          )}
        </Button>
      </div>
    </form>
  );
}
