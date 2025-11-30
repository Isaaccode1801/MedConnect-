// src/features/doctor/pages/PaginaCadastroPaciente.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
// Importe as funções do SEU service
import { createPaciente, getPaciente, updatePaciente, getHeaders } from '@/lib/pacientesService';
import AccessibilityMenu from "../../../components/ui/AccessibilityMenu";

/* ========================= Helpers ========================= */
function parseDateSmart(v) {
    if (!v) return null;
    if (v instanceof Date) return v;
    const s = String(v).trim();
    let m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
    if (m) {
        let dd = +m[1], mm = +m[2], yyyy = +m[3];
        if (yyyy < 100) yyyy += 2000;
        const d = new Date(Date.UTC(yyyy, mm - 1, dd));
        if (d.getUTCFullYear() === yyyy && d.getUTCMonth() === mm - 1 && d.getUTCDate() === dd) return d;
        return null;
    }
    m = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
    if (m) {
        const yyyy = +m[1], mm = +m[2], dd = +m[3];
        const d = new Date(Date.UTC(yyyy, mm - 1, dd));
        if (d.getUTCFullYear() === yyyy && d.getUTCMonth() === mm - 1 && d.getUTCDate() === dd) return d;
        return null;
    }
    const d = new Date(s);
    return isNaN(d) ? null : d;
}

function toISODate(v) {
    const d = parseDateSmart(v);
    if (!d) return '';
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(d.getUTCDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

function onlyDigits(v) { return (v || '').replace(/\D+/g, ''); }
function maskCPF(v) { v = onlyDigits(v).slice(0, 11); return v.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2'); }
function maskCEP(v) { v = onlyDigits(v).slice(0, 8); return v.replace(/(\d{5})(\d)/, '$1-$2'); }
function maskPhoneBRIntl(v) {
    v = onlyDigits(v);
    if (!v.startsWith('55')) v = '55' + v;
    v = v.slice(0, 13);
    const ddi = v.slice(0, 2), ddd = v.slice(2, 4), rest = v.slice(4);
    if (rest.length > 9) return `+${ddi} (${ddd}) ${rest.slice(0, 5)}-${rest.slice(5, 9)}`;
    if (rest.length > 5) return `+${ddi} (${ddd}) ${rest.slice(0, 5)}-${rest.slice(5, rest.length)}`;
    if (rest.length > 4) return `+${ddi} (${ddd}) ${rest.slice(0, 4)}-${rest.slice(4, 8)}`;
    if (ddd) return `+${ddi} (${ddd}) ${rest}`;
    if (ddi) return `+${ddi}`;
    return '';
}

function isValidCPF(raw) {
    const s = onlyDigits(raw);
    if (s.length !== 11) return false;
    if (/^(\d)\1+$/.test(s)) return false;
    let sum = 0; for (let i = 0; i < 9; i++) sum += parseInt(s[i]) * (10 - i);
    let d1 = (sum * 10) % 11; if (d1 === 10) d1 = 0; if (d1 !== parseInt(s[9])) return false;
    sum = 0; for (let i = 0; i < 10; i++) sum += parseInt(s[i]) * (11 - i);
    let d2 = (sum * 10) % 11; if (d2 === 10) d2 = 0; if (d2 !== parseInt(s[10])) return false;
    return true;
}

export default function PaginaCadastroPaciente() {
    const navigate = useNavigate();
    const { id: editingId } = useParams();
    const [isLoading, setIsLoading] = useState(!!editingId);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [toastMsg, setToastMsg] = useState({ msg: '', show: false, ok: true });

    const [formData, setFormData] = useState({
        full_name: '', social_name: '', cpf: '', email: '', phone_mobile: '',
        birth_date: '', sex: '', blood_type: '', weight_kg: '', height_m: '',
        bmi: '', cep: '', street: '', number: '', complement: '',
        neighborhood: '', city: '', state: '',
    });

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        let finalValue = type === 'checkbox' ? checked : value;

        if (name === 'cpf') finalValue = maskCPF(value);
        if (name === 'cep') finalValue = maskCEP(value);
        if (name === 'phone_mobile') finalValue = maskPhoneBRIntl(value);

        setFormData(prev => ({ ...prev, [name]: finalValue }));

        if (name === 'weight_kg' || name === 'height_m') {
            calculateBMI(name === 'weight_kg' ? finalValue : formData.weight_kg, name === 'height_m' ? finalValue : formData.height_m);
        }
    };

    const calculateBMI = (weight, height) => {
        const p = Number(String(weight).replace(',', '.'));
        const a = Number(String(height).replace(',', '.'));
        if (p > 0 && a > 0) {
            const bmiValue = (p / (a * a)).toFixed(1);
            setFormData(prev => ({ ...prev, bmi: bmiValue }));
        } else {
            setFormData(prev => ({ ...prev, bmi: '' }));
        }
    };

    const handleCepBlur = async (e) => {
        const cepValue = e.target.value;
        const digits = onlyDigits(cepValue);
        if (digits.length !== 8) return;
        setError(null);
        try {
            const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
            if (!res.ok) throw new Error('Falha na busca do CEP');
            const data = await res.json();
            if (data.erro) {
                setError('CEP não encontrado.');
            } else {
                setFormData(prev => ({
                    ...prev,
                    street: data.logradouro || '',
                    neighborhood: data.bairro || '',
                    city: data.localidade || '',
                    state: data.uf || '',
                }));
            }
        } catch (err) {
            console.error("Erro ViaCEP:", err);
            setError('Falha ao consultar CEP.');
        }
    };

    useEffect(() => {
        if (editingId) {
            setIsLoading(true);
            setError(null);
            getPaciente(editingId)
                .then(paciente => {
                    if (paciente) {
                        setFormData({
                            full_name: paciente.full_name || '',
                            social_name: paciente.social_name || '',
                            cpf: paciente.cpf ? maskCPF(paciente.cpf) : '',
                            email: paciente.email || '',
                            phone_mobile: paciente.phone_mobile ? maskPhoneBRIntl(paciente.phone_mobile) : '',
                            birth_date: paciente.birth_date ? toISODate(paciente.birth_date) : '',
                            sex: paciente.sex || '',
                            blood_type: paciente.blood_type || '',
                            weight_kg: paciente.weight_kg != null ? String(paciente.weight_kg).replace('.', ',') : '',
                            height_m: paciente.height_m != null ? String(paciente.height_m).replace('.', ',') : '',
                            bmi: paciente.bmi != null ? String(paciente.bmi).replace('.', ',') : '',
                            cep: paciente.cep ? maskCEP(paciente.cep) : '',
                            street: paciente.street || '',
                            number: paciente.number || '',
                            complement: paciente.complement || '',
                            neighborhood: paciente.neighborhood || '',
                            city: paciente.city || '',
                            state: paciente.state || '',
                        });
                        if(!paciente.bmi && paciente.weight_kg && paciente.height_m){
                            calculateBMI(paciente.weight_kg, paciente.height_m);
                        }
                    } else {
                        setError(`Paciente com ID ${editingId} não encontrado.`);
                    }
                })
                .catch(err => {
                    console.error("Erro ao carregar paciente:", err);
                    setError(`Falha ao carregar dados: ${err.message}`);
                })
                .finally(() => setIsLoading(false));
        } else {
            setIsLoading(false);
        }
    }, [editingId]);

    const showToast = (msg, ok = true) => {
        setToastMsg({ msg, show: true, ok });
        setTimeout(() => setToastMsg({ msg: '', show: false, ok: true }), 2500);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        if (!formData.full_name.trim()) {
            setError("Nome completo é obrigatório.");
            return;
        }
        if (formData.cpf && !isValidCPF(formData.cpf)) {
            setError("CPF inválido.");
            return;
        }
        const emailInput = e.target.elements.email;
        if (formData.email && emailInput && !emailInput.checkValidity()) {
            setError("Formato de e-mail inválido.");
            return;
        }

        setIsSubmitting(true);

        const dataToSubmit = {
            ...formData,
            cpf: onlyDigits(formData.cpf) || null,
            cep: onlyDigits(formData.cep) || null,
            phone_mobile: onlyDigits(formData.phone_mobile) || null,
            weight_kg: formData.weight_kg ? parseFloat(String(formData.weight_kg).replace(',', '.')) : null,
            height_m: formData.height_m ? parseFloat(String(formData.height_m).replace(',', '.')) : null,
            bmi: formData.bmi ? parseFloat(String(formData.bmi).replace(',', '.')) : null,
            social_name: formData.social_name || null,
            email: formData.email || null,
            birth_date: formData.birth_date || null,
            sex: formData.sex || null,
            blood_type: formData.blood_type || null,
            street: formData.street || null,
            number: formData.number || null,
            complement: formData.complement || null,
            neighborhood: formData.neighborhood || null,
            city: formData.city || null,
            state: formData.state || null,
        };

        try {
            if (editingId) {
                await updatePaciente(editingId, dataToSubmit);
                showToast('Paciente atualizado com sucesso!');
            } else {
                await createPaciente(dataToSubmit);
                showToast('Paciente cadastrado com sucesso!');
            }
            setTimeout(() => {
                navigate('/doctor/pacientes');
            }, 1500);
        } catch (err) {
            console.error("Erro ao salvar:", err);
            let userMessage = `Falha ao salvar: ${err.message}`;
            if (err.message && /duplicate key value.*cpf/i.test(err.message)) {
                userMessage = 'Este CPF já está cadastrado no sistema.';
            }
            setError(userMessage);
            showToast(userMessage, false);
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="theme-page" style={{ padding: '2rem', textAlign: 'center' }}>
                <div className="theme-text-primary">Carregando dados do paciente...</div>
            </div>
        );
    }

    return (
        <div className="theme-page">
            <main className="container" style={{ maxWidth: '1100px', margin: '20px auto', padding: '0 12px' }}>
                <div className="theme-card">
                    <div className="card-header theme-card-header">
                        <div className="card-title theme-text-primary">{editingId ? 'Editar Paciente' : 'Dados do Paciente'}</div>
                        <div className="card-actions">
                            <button
                                type="button" 
                                className="btn btn-secondary"
                                disabled={isSubmitting}
                                onClick={() => { if (window.confirm('Cancelar e voltar à lista?')) navigate('/doctor/pacientes'); }}
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit" 
                                className="btn btn-primary"
                                form="patientForm"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? 'Salvando...' : 'Salvar'}
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div className="error-message theme-error">
                            {error}
                        </div>
                    )}

                    <form id="patientForm" noValidate onSubmit={handleSubmit} className="form-container">
                        {/* 1. DADOS PESSOAIS */}
                        <section className="form-section" aria-labelledby="sec-pessoais">
                            <div className="section-header theme-section-header">
                                <div className="section-title theme-text-primary" id="sec-pessoais">1. Dados pessoais</div>
                            </div>
                            <div className="form-grid">
                                <div className="field theme-field" style={{ gridColumn: 'span 3' }}>
                                    <label htmlFor="full_name" className="theme-text-primary">
                                        Nome completo <span className="required">*</span>
                                    </label>
                                    <input 
                                        id="full_name" 
                                        name="full_name" 
                                        type="text" 
                                        required 
                                        placeholder="Nome completo"
                                        value={formData.full_name} 
                                        onChange={handleChange} 
                                        disabled={isSubmitting}
                                        className="theme-input"
                                    />
                                </div>

                                <div className="field theme-field">
                                    <label htmlFor="social_name" className="theme-text-primary">Nome social</label>
                                    <input 
                                        id="social_name" 
                                        name="social_name" 
                                        type="text" 
                                        placeholder="Apelido/nome social"
                                        value={formData.social_name} 
                                        onChange={handleChange} 
                                        disabled={isSubmitting}
                                        className="theme-input"
                                    />
                                </div>

                                <div className="field theme-field">
                                    <label htmlFor="cpf" className="theme-text-primary">
                                        CPF <span className="required">*</span>
                                    </label>
                                    <input 
                                        id="cpf" 
                                        name="cpf" 
                                        type="text" 
                                        inputMode="numeric" 
                                        placeholder="000.000.000-00" 
                                        maxLength="14" 
                                        required
                                        value={formData.cpf} 
                                        onChange={handleChange} 
                                        disabled={isSubmitting}
                                        className="theme-input"
                                    />
                                    <div className="hint theme-text-muted">Validação automática dos 11 dígitos</div>
                                </div>

                                <div className="field theme-field">
                                    <label htmlFor="email" className="theme-text-primary">E-mail</label>
                                    <input 
                                        id="email" 
                                        name="email" 
                                        type="email" 
                                        placeholder="nome@exemplo.com"
                                        value={formData.email} 
                                        onChange={handleChange} 
                                        disabled={isSubmitting}
                                        className="theme-input"
                                    />
                                </div>

                                <div className="field theme-field">
                                    <label htmlFor="phone_mobile" className="theme-text-primary">Celular</label>
                                    <input 
                                        id="phone_mobile" 
                                        name="phone_mobile" 
                                        type="tel" 
                                        inputMode="numeric" 
                                        placeholder="+55 (00) 00000-0000" 
                                        maxLength="20"
                                        value={formData.phone_mobile} 
                                        onChange={handleChange} 
                                        disabled={isSubmitting}
                                        className="theme-input"
                                    />
                                </div>

                                <div className="field theme-field">
                                    <label htmlFor="birth_date" className="theme-text-primary">Data de nascimento</label>
                                    <input 
                                        id="birth_date" 
                                        name="birth_date" 
                                        type="date"
                                        value={formData.birth_date} 
                                        onChange={handleChange} 
                                        disabled={isSubmitting}
                                        className="theme-input"
                                    />
                                </div>

                                <div className="field theme-field">
                                    <label className="theme-text-primary">Sexo</label>
                                    <div className="radio-group theme-radio-group" role="radiogroup" aria-label="Sexo">
                                        <label className="theme-radio-label">
                                            <input type="radio" name="sex" value="M" checked={formData.sex === 'M'} onChange={handleChange} disabled={isSubmitting} />
                                            <span className="theme-text-primary">Masculino</span>
                                        </label>
                                        <label className="theme-radio-label">
                                            <input type="radio" name="sex" value="F" checked={formData.sex === 'F'} onChange={handleChange} disabled={isSubmitting} />
                                            <span className="theme-text-primary">Feminino</span>
                                        </label>
                                        <label className="theme-radio-label">
                                            <input type="radio" name="sex" value="O" checked={formData.sex === 'O'} onChange={handleChange} disabled={isSubmitting} />
                                            <span className="theme-text-primary">Outro</span>
                                        </label>
                                        <label className="theme-radio-label">
                                            <input type="radio" name="sex" value="" checked={formData.sex === ''} onChange={handleChange} disabled={isSubmitting} />
                                            <span className="theme-text-primary">Prefiro não informar</span>
                                        </label>
                                    </div>
                                </div>

                                <div className="field theme-field">
                                    <label htmlFor="blood_type" className="theme-text-primary">Tipo sanguíneo</label>
                                    <select 
                                        id="blood_type" 
                                        name="blood_type" 
                                        value={formData.blood_type} 
                                        onChange={handleChange} 
                                        disabled={isSubmitting}
                                        className="theme-input"
                                    >
                                        <option value="">Selecione…</option>
                                        <option>A+</option><option>A-</option>
                                        <option>B+</option><option>B-</option>
                                        <option>AB+</option><option>AB-</option>
                                        <option>O+</option><option>O-</option>
                                    </select>
                                </div>

                                <div className="field theme-field">
                                    <label htmlFor="weight_kg" className="theme-text-primary">Peso (kg)</label>
                                    <input 
                                        id="weight_kg" 
                                        name="weight_kg" 
                                        type="number" 
                                        step="0.1" 
                                        placeholder="Ex.: 65.5"
                                        value={formData.weight_kg} 
                                        onChange={handleChange} 
                                        disabled={isSubmitting}
                                        className="theme-input"
                                    />
                                </div>

                                <div className="field theme-field">
                                    <label htmlFor="height_m" className="theme-text-primary">Altura (m)</label>
                                    <input 
                                        id="height_m" 
                                        name="height_m" 
                                        type="number" 
                                        step="0.01" 
                                        placeholder="Ex.: 1.65"
                                        value={formData.height_m} 
                                        onChange={handleChange} 
                                        disabled={isSubmitting}
                                        className="theme-input"
                                    />
                                </div>

                                <div className="field theme-field">
                                    <label htmlFor="bmi" className="theme-text-primary">IMC</label>
                                    <input 
                                        id="bmi" 
                                        name="bmi" 
                                        type="text" 
                                        placeholder="Calculado" 
                                        readOnly
                                        value={formData.bmi} 
                                        disabled={isSubmitting}
                                        className="theme-input"
                                    />
                                </div>
                            </div>
                        </section>

                        {/* 2. ENDEREÇO */}
                        <section className="form-section" aria-labelledby="sec-endereco">
                            <div className="section-header theme-section-header">
                                <div className="section-title theme-text-primary" id="sec-endereco">2. Endereço</div>
                            </div>
                            <div className="form-grid">
                                <div className="field theme-field">
                                    <label htmlFor="cep" className="theme-text-primary">CEP</label>
                                    <input 
                                        id="cep" 
                                        name="cep" 
                                        type="text" 
                                        inputMode="numeric" 
                                        placeholder="00000-000" 
                                        maxLength="9"
                                        value={formData.cep} 
                                        onChange={handleChange} 
                                        onBlur={handleCepBlur} 
                                        disabled={isSubmitting}
                                        className="theme-input"
                                    />
                                    <div className="hint theme-text-muted">Busca automática via ViaCEP</div>
                                </div>

                                <div className="field theme-field" style={{ gridColumn: 'span 2' }}>
                                    <label htmlFor="street" className="theme-text-primary">Logradouro</label>
                                    <input 
                                        id="street" 
                                        name="street" 
                                        type="text"
                                        value={formData.street} 
                                        onChange={handleChange} 
                                        disabled={isSubmitting}
                                        className="theme-input"
                                    />
                                </div>

                                <div className="field theme-field">
                                    <label htmlFor="number" className="theme-text-primary">Número</label>
                                    <input 
                                        id="number" 
                                        name="number" 
                                        type="text"
                                        value={formData.number} 
                                        onChange={handleChange} 
                                        disabled={isSubmitting}
                                        className="theme-input"
                                    />
                                </div>

                                <div className="field theme-field">
                                    <label htmlFor="complement" className="theme-text-primary">Complemento</label>
                                    <input 
                                        id="complement" 
                                        name="complement" 
                                        type="text"
                                        value={formData.complement} 
                                        onChange={handleChange} 
                                        disabled={isSubmitting}
                                        className="theme-input"
                                    />
                                </div>

                                <div className="field theme-field">
                                    <label htmlFor="neighborhood" className="theme-text-primary">Bairro</label>
                                    <input 
                                        id="neighborhood" 
                                        name="neighborhood" 
                                        type="text"
                                        value={formData.neighborhood} 
                                        onChange={handleChange} 
                                        disabled={isSubmitting}
                                        className="theme-input"
                                    />
                                </div>

                                <div className="field theme-field">
                                    <label htmlFor="city" className="theme-text-primary">Cidade</label>
                                    <input 
                                        id="city" 
                                        name="city" 
                                        type="text"
                                        value={formData.city} 
                                        onChange={handleChange} 
                                        disabled={isSubmitting}
                                        className="theme-input"
                                    />
                                </div>

                                <div className="field theme-field">
                                    <label htmlFor="state" className="theme-text-primary">Estado</label>
                                    <input 
                                        id="state" 
                                        name="state" 
                                        type="text" 
                                        maxLength="2" 
                                        placeholder="UF"
                                        value={formData.state} 
                                        onChange={handleChange} 
                                        disabled={isSubmitting}
                                        className="theme-input"
                                    />
                                </div>
                            </div>
                        </section>
                    </form>
                </div>
            </main>

            {/* Toast */}
            <div className={`toast ${toastMsg.show ? 'show' : ''} ${toastMsg.ok ? 'toast-success' : 'toast-error'}`} 
                 role="status" 
                 aria-live="polite">
                {toastMsg.msg}
            </div>

            <AccessibilityMenu />

            <style jsx>{`
                .theme-page {
                    background: var(--color-bg-primary);
                    min-height: 100vh;
                    color: var(--color-text-primary);
                }

                .theme-card {
                    background: var(--color-bg-card);
                    border: 1px solid var(--color-border);
                    border-radius: 12px;
                    box-shadow: var(--shadow-sm);
                }

                .card-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 20px 24px;
                    border-bottom: 1px solid var(--color-border);
                }

                .card-title {
                    font-size: 1.5rem;
                    font-weight: 600;
                    margin: 0;
                }

                .card-actions {
                    display: flex;
                    gap: 12px;
                }

                .card-actions .btn {
    padding: 10px 20px;
    border: none;
    border-radius: 8px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
}

/* BOTÃO SALVAR (PRIMARY) */
.card-actions .btn.btn-primary {
    background: #3fbbc0 !important; /* ✅ Azul no modo claro */
    color: white !important;
}

.card-actions .btn.btn-primary:hover:not(:disabled) {
    background: #2ca5aa !important;
    transform: translateY(-1px);
}

.modo-escuro .card-actions .btn.btn-primary {
    background: var(--color-primary) !important; /* ✅ Usa variável no modo escuro */
    color: white !important;
}

.modo-escuro .card-actions .btn.btn-primary:hover:not(:disabled) {
    background: var(--color-primary-dark) !important;
}

/* BOTÃO CANCELAR (SECONDARY) */
.card-actions .btn.btn-secondary {
    background: white !important; /* ✅ Branco no modo claro */
    color: #374151 !important; /* ✅ Cinza escuro fixo */
    border: 1px solid #d1d5db !important; /* ✅ Borda cinza claro */
}

.card-actions .btn.btn-secondary:hover:not(:disabled) {
    background: #f3f4f6 !important; /* ✅ Cinza muito claro no hover */
    color: #374151 !important;
    border-color: #9ca3af !important; /* ✅ Cinza médio no hover */
}

.modo-escuro .card-actions .btn.btn-secondary {
    background: var(--color-bg-tertiary) !important; /* ✅ Fundo do tema no modo escuro */
    color: var(--color-text-primary) !important; /* ✅ Texto do tema */
    border: 1px solid var(--color-border) !important; /* ✅ Borda do tema */
}

.modo-escuro .card-actions .btn.btn-secondary:hover:not(:disabled) {
    background: var(--color-bg-secondary) !important; /* ✅ Fundo secundário no hover */
    color: var(--color-text-primary) !important;
    border-color: var(--color-border-strong) !important; /* ✅ Borda mais forte */
}

/* ESTADO DESABILITADO */
.card-actions .btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
}

.modo-escuro .card-actions .btn:disabled {
    background: var(--color-bg-tertiary) !important;
    color: var(--color-text-muted) !important;
}

                .error-message {
                    background: rgba(239, 68, 68, 0.1);
                    color: #dc2626;
                    padding: 12px 16px;
                    margin: 0 24px 16px;
                    border-radius: 8px;
                    border: 1px solid rgba(239, 68, 68, 0.2);
                }

                .form-container {
                    padding: 0;
                }

                .form-section {
                    margin-bottom: 24px;
                }

                .section-header {
                    padding: 16px 24px;
                    border-bottom: 1px solid var(--color-border);
                    background: var(--color-bg-tertiary);
                }

                .section-title {
                    font-size: 1.1rem;
                    font-weight: 600;
                    margin: 0;
                }

                .form-grid {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 16px;
                    padding: 24px;
                }

                .field {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }

                .theme-text-primary {
                    color: var(--color-text-primary);
                }

                .theme-text-secondary {
                    color: var(--color-text-secondary);
                }

                .theme-text-muted {
                    color: var(--color-text-muted);
                }

                .theme-input {
                    background: var(--color-bg-card);
                    color: var(--color-text-primary);
                    border: 1px solid var(--color-border);
                    border-radius: 6px;
                    padding: 10px 12px;
                    font-size: 14px;
                    transition: border-color 0.2s ease;
                }

                .theme-input:focus {
                    outline: none;
                    border-color: #374151;
                    box-shadow: 0 0 0 3px rgba(55, 65, 81, 0.1);
                }

                .theme-input:disabled {
                    background: var(--color-bg-tertiary);
                    color: var(--color-text-muted);
                    cursor: not-allowed;
                }

                .theme-input::placeholder {
                    color: var(--color-text-muted);
                }

                .required {
                    color: #dc2626;
                }

                .hint {
                    font-size: 12px;
                    margin-top: 4px;
                }

                .radio-group {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }

                .theme-radio-label {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    cursor: pointer;
                }

                .theme-radio-label input[type="radio"] {
                    margin: 0;
                }

                .toast {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    padding: 12px 20px;
                    border-radius: 8px;
                    font-weight: 500;
                    z-index: 10000;
                    transform: translateX(150%);
                    transition: transform 0.3s ease;
                }

                .toast.show {
                    transform: translateX(0);
                }

                .toast-success {
                    background: #d1fae5;
                    color: #065f46;
                    border: 1px solid #a7f3d0;
                }

                .toast-error {
                    background: #fee2e2;
                    color: #991b1b;
                    border: 1px solid #fecaca;
                }

                @media (max-width: 1024px) {
                    .form-grid {
                        grid-template-columns: repeat(2, 1fr);
                    }
                }

                @media (max-width: 768px) {
                    .form-grid {
                        grid-template-columns: 1fr;
                    }
                    
                    .card-header {
                        flex-direction: column;
                        gap: 16px;
                        align-items: flex-start;
                    }
                    
                    .card-actions {
                        width: 100%;
                        justify-content: flex-end;
                    }
                }
            `}</style>
        </div>
    );
}