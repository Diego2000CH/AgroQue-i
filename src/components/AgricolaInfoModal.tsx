import React, { useState } from 'react';
import { Building2, MapPin, Save, X } from 'lucide-react';
import { AgricolaInfo } from '../types/fieldbook';
import { AGRICOLA_INFO } from '../data/initialData';

interface AgricolaInfoModalProps {
  initial: AgricolaInfo;
  onClose: () => void;
  onSave: (info: AgricolaInfo) => void;
}

export const AgricolaInfoModal: React.FC<AgricolaInfoModalProps> = ({
  initial,
  onClose,
  onSave,
}) => {
  const [razonSocial, setRazonSocial] = useState(initial.razonSocial || '');
  const [nombreCorto, setNombreCorto] = useState(initial.nombreCorto || '');
  const [rut, setRut] = useState(initial.rut || '');
  const [referencia, setReferencia] = useState(initial.referencia || '');
  const [giro, setGiro] = useState(initial.giro || '');
  const [domicilio, setDomicilio] = useState(initial.domicilio || '');
  const [comuna, setComuna] = useState(initial.comuna || '');
  const [utm, setUtm] = useState(initial.utm || '');
  const [lat, setLat] = useState(String(initial.defaultCenter?.lat ?? AGRICOLA_INFO.defaultCenter.lat));
  const [lng, setLng] = useState(String(initial.defaultCenter?.lng ?? AGRICOLA_INFO.defaultCenter.lng));
  const [certificacion, setCertificacion] = useState(initial.certificacion || '');
  const [representanteLegal, setRepresentanteLegal] = useState(initial.representanteLegal || '');
  const [telefono, setTelefono] = useState(initial.telefono || '');
  const [email, setEmail] = useState(initial.email || '');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!razonSocial.trim() || !nombreCorto.trim() || !rut.trim()) {
      setError('Razón Social, Nombre Corto y RUT son obligatorios.');
      return;
    }
    const parsedLat = Number(lat);
    const parsedLng = Number(lng);
    if (
      Number.isNaN(parsedLat) ||
      Number.isNaN(parsedLng) ||
      parsedLat < -90 ||
      parsedLat > 90 ||
      parsedLng < -180 ||
      parsedLng > 180
    ) {
      setError('Las coordenadas geográficas del predio son inválidas.');
      return;
    }

    onSave({
      razonSocial: razonSocial.trim(),
      nombreCorto: nombreCorto.trim(),
      rut: rut.trim(),
      referencia: referencia.trim(),
      giro: giro.trim(),
      domicilio: domicilio.trim(),
      comuna: comuna.trim(),
      utm: utm.trim(),
      defaultCenter: {
        lat: Number(parsedLat.toFixed(6)),
        lng: Number(parsedLng.toFixed(6)),
      },
      certificacion: certificacion.trim(),
      representanteLegal: representanteLegal.trim(),
      telefono: telefono.trim(),
      email: email.trim(),
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-label="Editar Información de la Agrícola"
    >
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />
      <div className="relative w-full max-w-2xl max-h-[92vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
            <h3 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
              Editar Información de la Agrícola
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Estos datos se muestran en el cuaderno, barra lateral, mapa predial y en todos los membretes de PDF y documentos Word tamaño Carta.
          </p>

          {error && (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Razón Social *
              </label>
              <input
                type="text"
                required
                value={razonSocial}
                onChange={(e) => setRazonSocial(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Nombre Corto / Comercial *
              </label>
              <input
                type="text"
                required
                value={nombreCorto}
                onChange={(e) => setNombreCorto(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                RUT Empresa *
              </label>
              <input
                type="text"
                required
                value={rut}
                onChange={(e) => setRut(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                N° Referencia / Rol Interno
              </label>
              <input
                type="text"
                value={referencia}
                onChange={(e) => setReferencia(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Representante Legal
              </label>
              <input
                type="text"
                value={representanteLegal}
                onChange={(e) => setRepresentanteLegal(e.target.value)}
                placeholder="Nombre completo"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Giro Agrícola / Rubro Productivo
            </label>
            <input
              type="text"
              value={giro}
              onChange={(e) => setGiro(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Predio / Domicilio / Ruta
              </label>
              <input
                type="text"
                value={domicilio}
                onChange={(e) => setDomicilio(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Comuna, Provincia y Región
              </label>
              <input
                type="text"
                value={comuna}
                onChange={(e) => setComuna(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Certificaciones / Registros SAG
            </label>
            <input
              type="text"
              value={certificacion}
              onChange={(e) => setCertificacion(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Teléfono de Contacto
              </label>
              <input
                type="text"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="+56 9 ..."
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Correo Electrónico de Contacto (Opcional)
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ejemplo@gmail.com"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
          </div>

          <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-slate-50/70 dark:bg-slate-950/50 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200">
              <MapPin className="w-4 h-4 text-emerald-700" />
              <span>Georreferenciación Base del Predio (Mapa y Clima)</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">Referencia UTM</label>
                <input
                  type="text"
                  value={utm}
                  onChange={(e) => setUtm(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">Latitud Centro (WGS84)</label>
                <input
                  type="number"
                  step="0.000001"
                  required
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">Longitud Centro (WGS84)</label>
                <input
                  type="number"
                  step="0.000001"
                  required
                  value={lng}
                  onChange={(e) => setLng(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Guardar Información</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
