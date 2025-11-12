// src/features/doctor/pages/PaginaCadastroPaciente.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
// Importe as funções do SEU service
import { createPaciente, getPaciente, updatePaciente, getHeaders } from '@/lib/pacientesService';
// Importe os estilos (ajuste o caminho se necessário)
import '@/styles/PaginaCadastroPaciente.css'; // Ou importe no seu CSS global
import AccessibilityMenu from "../../../components/ui/AccessibilityMenu";

/* ========================= Helpers (adaptados de cadMed.js) ========================= */
// datas: aceita DD/MM/YYYY, D/M/YYYY, YYYY-MM-DD, YYYY/M/D
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
function toISODate(v) { // 'YYYY-MM-DD' p/ <input type="date">
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
    if (rest.length > 5) return `+${ddi} (${ddd}) ${rest.slice(0, 5)}-${rest.slice(5, rest.length)}`; // Handle 9 digits
    if (rest.length > 4) return `+${ddi} (${ddd}) ${rest.slice(0, 4)}-${rest.slice(4, 8)}`; // Handle 8 digits
    if (ddd) return `+${ddi} (${ddd}) ${rest}`;
    if (ddi) return `+${ddi}`;
    return ''; // Return empty if nothing matches
}
function isValidCPF(raw) {
    const s = onlyDigits(raw);
    if (s.length !== 11) return false;
    if (/^(\d)\1+$/.test(s)) return false; // Verifica se todos os dígitos são iguais
    let sum = 0; for (let i = 0; i < 9; i++) sum += parseInt(s[i]) * (10 - i);
    let d1 = (sum * 10) % 11; if (d1 === 10) d1 = 0; if (d1 !== parseInt(s[9])) return false;
    sum = 0; for (let i = 0; i < 10; i++) sum += parseInt(s[i]) * (11 - i);
    let d2 = (sum * 10) % 11; if (d2 === 10) d2 = 0; if (d2 !== parseInt(s[10])) return false;
    return true;
}

// --- Componente ---
export default function PaginaCadastroPaciente() {
    const navigate = useNavigate();
    const { id: editingId } = useParams(); // Pega ID da URL se estiver editando
    const [isLoading, setIsLoading] = useState(!!editingId); // Começa loading se estiver editando
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [toastMsg, setToastMsg] = useState({ msg: '', show: false, ok: true });

    // Estados para cada campo do formulário
    const [formData, setFormData] = useState({
        full_name: '', social_name: '', cpf: '', email: '', phone_mobile: '',
        birth_date: '', sex: '', blood_type: '', weight_kg: '', height_m: '',
        bmi: '', cep: '', street: '', number: '', complement: '',
        neighborhood: '', city: '', state: '',
        // Adicione outros campos se necessário
    });

    // Função para atualizar o estado do formulário
    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        let finalValue = type === 'checkbox' ? checked : value;

        // Aplica máscaras enquanto digita
        if (name === 'cpf') finalValue = maskCPF(value);
        if (name === 'cep') finalValue = maskCEP(value);
        if (name === 'phone_mobile') finalValue = maskPhoneBRIntl(value);

        setFormData(prev => ({ ...prev, [name]: finalValue }));

        // Calcula IMC automaticamente
        if (name === 'weight_kg' || name === 'height_m') {
            calculateBMI(name === 'weight_kg' ? finalValue : formData.weight_kg, name === 'height_m' ? finalValue : formData.height_m);
        }
    };

    // Calcula e atualiza IMC
    const calculateBMI = (weight, height) => {
        const p = Number(String(weight).replace(',', '.'));
        const a = Number(String(height).replace(',', '.'));
        if (p > 0 && a > 0) {
            const bmiValue = (p / (a * a)).toFixed(1);
            setFormData(prev => ({ ...prev, bmi: bmiValue }));
        } else {
             setFormData(prev => ({ ...prev, bmi: '' })); // Limpa se peso/altura inválidos
        }
    };

    // Busca CEP via ViaCEP
    const handleCepBlur = async (e) => {
        const cepValue = e.target.value;
        const digits = onlyDigits(cepValue);
        if (digits.length !== 8) return;
        setError(null); // Limpa erro de CEP anterior
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

    // Efeito para carregar dados do paciente no modo de edição
    useEffect(() => {
        if (editingId) {
            setIsLoading(true);
            setError(null);
            getPaciente(editingId) // Usa a função do service
                .then(paciente => {
                    if (paciente) {
                        // Preenche o estado formData com os dados da API
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
                            bmi: paciente.bmi != null ? String(paciente.bmi).replace('.', ',') : '', // Supabase já deve retornar calculado, ou recalculamos
                            cep: paciente.cep ? maskCEP(paciente.cep) : '',
                            street: paciente.street || '',
                            number: paciente.number || '',
                            complement: paciente.complement || '',
                            neighborhood: paciente.neighborhood || '',
                            city: paciente.city || '',
                            state: paciente.state || '',
                        });
                        // Recalcula IMC se não veio da API
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
             setIsLoading(false); // Garante que loading é false se não estiver editando
        }
    }, [editingId]); // Roda quando o ID muda

    // Função de Toast (simplificada)
    const showToast = (msg, ok = true) => {
        setToastMsg({ msg, show: true, ok });
        setTimeout(() => setToastMsg({ msg: '', show: false, ok: true }), 2500);
    };

    // Função de Submit
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null); // Limpa erros anteriores

        // --- Validações ---
        if (!formData.full_name.trim()) {
            setError("Nome completo é obrigatório.");
            return;
        }
        if (formData.cpf && !isValidCPF(formData.cpf)) {
            setError("CPF inválido.");
            return;
        }
        const emailInput = e.target.elements.email; // Pega o input diretamente para validação HTML5
        if (formData.email && emailInput && !emailInput.checkValidity()) {
             setError("Formato de e-mail inválido.");
             return;
        }
        // Adicione outras validações se necessário

        setIsSubmitting(true);

        // Prepara os dados para enviar (remove máscaras, converte tipos)
        const dataToSubmit = {
            ...formData,
            cpf: onlyDigits(formData.cpf) || null,
            cep: onlyDigits(formData.cep) || null,
            phone_mobile: onlyDigits(formData.phone_mobile) || null,
            weight_kg: formData.weight_kg ? parseFloat(String(formData.weight_kg).replace(',', '.')) : null,
            height_m: formData.height_m ? parseFloat(String(formData.height_m).replace(',', '.')) : null,
            bmi: formData.bmi ? parseFloat(String(formData.bmi).replace(',', '.')) : null,
             // Garante que campos opcionais vazios sejam enviados como null
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
        // Remove BMI se não for para ser enviado (Supabase pode calcular)
        // delete dataToSubmit.bmi;

        try {
            if (editingId) {
                await updatePaciente(editingId, dataToSubmit);
                showToast('Paciente atualizado com sucesso!');
            } else {
                await createPaciente(dataToSubmit);
                showToast('Paciente cadastrado com sucesso!');
            }
            // Redireciona após um pequeno delay para o toast ser visível
            setTimeout(() => {
                navigate('/doctor/pacientes'); // Ajuste a rota se necessário
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
        // Não definir isSubmitting como false aqui se o redirecionamento ocorrer
    };

    if (isLoading) {
        return <div style={{ padding: '2rem', textAlign: 'center' }}>Carregando dados do paciente...</div>;
    }

    return (
        <>


            <main className="container" style={{ maxWidth: '1100px', margin: '20px auto', padding: '0 12px' }}>
                <div className="card">
                    <div className="card-header">
                        <div className="card-title">{editingId ? 'Editar Paciente' : 'Dados do Paciente'}</div>
                        <div className="card-actions">
                            <button
                                id="btnCancel" type="button" className="btn secondary"
                                disabled={isSubmitting}
                                onClick={() => { if (window.confirm('Cancelar e voltar à lista?')) navigate('/doctor/pacientes'); }} // Ajuste a rota
                            >
                                Cancelar
                            </button>
                            {/* O botão submit agora está ligado ao form */}
                            <button
                                id="btnSave" type="submit" className="btn"
                                form="patientForm" // Liga ao formulário pelo ID
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? 'Salvando...' : 'Salvar'}
                            </button>
                        </div>
                    </div>

                    {/* Exibe erro geral do formulário */}
                    {error && <div className="error" style={{ color: 'red', padding: '10px 16px', background: '#ffebee' }}>{error}</div>}

                    <form id="patientForm" noValidate onSubmit={handleSubmit} style={{ padding: '16px' }}>
                        {/* 1. DADOS PESSOAIS */}
                        <section className="section" aria-labelledby="sec-pessoais">
                            <div className="section-header">
                                <div className="section-title" id="sec-pessoais">1. Dados pessoais</div>
                            </div>
                            <div style={{ padding: '16px' }} className="grid grid-cols-4">

                                <div className="field" style={{ gridColumn: 'span 3' }}>
                                    <label htmlFor="full_name">Nome completo <span className="error">*</span></label>
                                    <input id="full_name" name="full_name" type="text" required placeholder="Nome completo"
                                           value={formData.full_name} onChange={handleChange} disabled={isSubmitting} />
                                    {/* Validação pode ser mostrada aqui */}
                                </div>
                                <div className="field">
                                    <label htmlFor="social_name">Nome social</label>
                                    <input id="social_name" name="social_name" type="text" placeholder="Apelido/nome social"
                                           value={formData.social_name} onChange={handleChange} disabled={isSubmitting} />
                                </div>

                                <div className="field">
                                    <label htmlFor="cpf">CPF <span className="error">*</span></label>
                                    <input id="cpf" name="cpf" type="text" inputMode="numeric" placeholder="000.000.000-00" maxLength="14" required
                                           value={formData.cpf} onChange={handleChange} disabled={isSubmitting} />
                                    <div className="hint">Validação automática dos 11 dígitos</div>
                                </div>

                                <div className="field">
                                    <label htmlFor="email">E-mail</label>
                                    <input id="email" name="email" type="email" placeholder="nome@exemplo.com"
                                           value={formData.email} onChange={handleChange} disabled={isSubmitting} />
                                </div>

                                <div className="field">
                                    <label htmlFor="phone_mobile">Celular</label>
                                    <input id="phone_mobile" name="phone_mobile" type="tel" inputMode="numeric" placeholder="+55 (00) 00000-0000" maxLength="20"
                                           value={formData.phone_mobile} onChange={handleChange} disabled={isSubmitting} />
                                </div>

                                <div className="field">
                                    <label htmlFor="birth_date">Data de nascimento</label>
                                    <input id="birth_date" name="birth_date" type="date"
                                           value={formData.birth_date} onChange={handleChange} disabled={isSubmitting} />
                                </div>

                                <div className="field">
                                    <label>Sexo</label>
                                    <div className="radio-group" role="radiogroup" aria-label="Sexo">
                                        <label><input type="radio" name="sex" value="M" checked={formData.sex === 'M'} onChange={handleChange} disabled={isSubmitting} /> Masculino</label>
                                        <label><input type="radio" name="sex" value="F" checked={formData.sex === 'F'} onChange={handleChange} disabled={isSubmitting} /> Feminino</label>
                                        <label><input type="radio" name="sex" value="O" checked={formData.sex === 'O'} onChange={handleChange} disabled={isSubmitting} /> Outro</label>
                                        <label><input type="radio" name="sex" value="" checked={formData.sex === ''} onChange={handleChange} disabled={isSubmitting} /> Prefiro não informar</label>
                                    </div>
                                </div>

                                <div className="field">
                                    <label htmlFor="blood_type">Tipo sanguíneo</label>
                                    <select id="blood_type" name="blood_type" value={formData.blood_type} onChange={handleChange} disabled={isSubmitting}>
                                        <option value="">Selecione…</option>
                                        <option>A+</option><option>A-</option>
                                        <option>B+</option><option>B-</option>
                                        <option>AB+</option><option>AB-</option>
                                        <option>O+</option><option>O-</option>
                                    </select>
                                </div>

                                <div className="field">
                                    <label htmlFor="weight_kg">Peso (kg)</label>
                                    <input id="weight_kg" name="weight_kg" type="number" step="0.1" placeholder="Ex.: 65.5"
                                           value={formData.weight_kg} onChange={handleChange} disabled={isSubmitting} />
                                </div>

                                <div className="field">
                                    <label htmlFor="height_m">Altura (m)</label>
                                    <input id="height_m" name="height_m" type="number" step="0.01" placeholder="Ex.: 1.65"
                                           value={formData.height_m} onChange={handleChange} disabled={isSubmitting} />
                                </div>

                                <div className="field">
                                    <label htmlFor="bmi">IMC</label>
                                    <input id="bmi" name="bmi" type="text" placeholder="Calculado" readOnly // Geralmente readonly
                                           value={formData.bmi} disabled={isSubmitting} />
                                </div>

                            </div>
                        </section>

                        {/* 2. ENDEREÇO */}
                        <details className="section" open aria-labelledby="sec-endereco">
                            <summary className="section-header"><div className="section-title" id="sec-endereco">2. Endereço</div></summary>
                            <div style={{ padding: '16px' }} className="grid grid-cols-4">
                                <div className="field">
                                    <label htmlFor="cep">CEP</label>
                                    <input id="cep" name="cep" type="text" inputMode="numeric" placeholder="00000-000" maxLength="9"
                                           value={formData.cep} onChange={handleChange} onBlur={handleCepBlur} disabled={isSubmitting} />
                                    <div className="hint">Busca automática via ViaCEP</div>
                                </div>
                                <div className="field" style={{ gridColumn: 'span 2' }}>
                                    <label htmlFor="street">Logradouro</label>
                                    <input id="street" name="street" type="text"
                                           value={formData.street} onChange={handleChange} disabled={isSubmitting} />
                                </div>
                                <div className="field">
                                    <label htmlFor="number">Número</label>
                                    <input id="number" name="number" type="text"
                                           value={formData.number} onChange={handleChange} disabled={isSubmitting} />
                                </div>

                                <div className="field">
                                    <label htmlFor="complement">Complemento</label>
                                    <input id="complement" name="complement" type="text"
                                           value={formData.complement} onChange={handleChange} disabled={isSubmitting} />
                                </div>
                                <div className="field">
                                    <label htmlFor="neighborhood">Bairro</label>
                                    <input id="neighborhood" name="neighborhood" type="text"
                                           value={formData.neighborhood} onChange={handleChange} disabled={isSubmitting} />
                                </div>
                                <div className="field">
                                    <label htmlFor="city">Cidade</label>
                                    <input id="city" name="city" type="text"
                                           value={formData.city} onChange={handleChange} disabled={isSubmitting} />
                                </div>
                                <div className="field">
                                    <label htmlFor="state">Estado</label>
                                    <input id="state" name="state" type="text" maxLength="2" placeholder="UF"
                                           value={formData.state} onChange={handleChange} disabled={isSubmitting} />
                                </div>
                                {/* Referência pode ser omitida ou adicionada se necessário */}
                            </div>
                        </details>
                        {/* Adicione outras seções (3. Contato, 4. Responsável) se precisar, seguindo o mesmo padrão */}
                    </form>
                </div>
            </main>

            {/* Toast */}
            <div className={`toast ${toastMsg.show ? 'show' : ''}`} role="status" aria-live="polite"
                 style={{ borderColor: toastMsg.ok ? 'var(--success)' : 'var(--danger)' }}>
                {toastMsg.msg}
            </div>
            <AccessibilityMenu />
        </>
    );
}

// Componente Labeled (pode mover para um arquivo de UI compartilhado)
function Labeled({ children, className = "" }) {
    return (
        <label className={`flex flex-col gap-1 text-sm text-slate-700 ${className}`}>
            {children}
        </label>
    );
}