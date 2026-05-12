document.addEventListener('DOMContentLoaded', () => {

    // ========================================================================
    // 1. ÎNCĂRCAREA MENIULUI DE NAVIGARE (HEADER)
    // ========================================================================
    fetch('components/header.html')
        .then(response => response.text())
        .then(data => {
            const placeholder = document.getElementById('header-placeholder');
            if (placeholder) placeholder.innerHTML = data;
        })
        .catch(error => console.error('Eroare la încărcarea header-ului:', error));


    // ========================================================================
    // 2. ÎNCĂRCAREA DINAMICĂ A LIMBILOR DISPONIBILE DIN BAZA DE DATE
    // ========================================================================
    const langContainer = document.getElementById('languagesContainer');
    if (langContainer) {
        fetch('http://localhost:3000/api/limbi')
            .then(response => response.json())
            .then(limbi => {
                langContainer.innerHTML = ''; // Ștergem textul de "Loading..."
                limbi.forEach(limba => {
                    langContainer.innerHTML += `
                        <label class="custom-checkbox">
                            <input type="checkbox" name="limba" value="${limba}">
                            <span>${limba}</span>
                        </label>
                    `;
                });
            })
            .catch(error => {
                console.error('Eroare la încărcarea limbilor:', error);
                langContainer.innerHTML = '<p style="font-size: 12px; color: #ff8a80;">Nu s-au putut încărca limbile.</p>';
            });
    }


    // ========================================================================
    // 3. LOGICA DE TRIMITERE A FORMULARULUI DE APLICARE (INSERT)
    // ========================================================================
    const applyForm = document.getElementById('applyForm');
    if (applyForm) {
        applyForm.addEventListener('submit', async (e) => {
            e.preventDefault(); // Oprim reîncărcarea paginii

            const formData = {
                prenume: document.getElementById('firstName').value.trim(),
                nume: document.getElementById('lastName').value.trim(),
                email: document.getElementById('email').value.trim(),
                telefon: document.getElementById('phone').value.trim(),
                roleType: document.getElementById('roleType').value,
                id_adapost: document.getElementById('shelter').value,
                specializari: [],
                limbi: [],
                limba_noua: document.getElementById('otherLanguage') ? document.getElementById('otherLanguage').value.trim() : ''
            };

            applyForm.querySelectorAll('input[name="specializare"]:checked').forEach(cb => {
                formData.specializari.push(cb.value);
            });

            applyForm.querySelectorAll('input[name="limba"]:checked').forEach(cb => {
                formData.limbi.push(cb.value);
            });

            if (formData.specializari.length === 0) {
                alert('Te rog să selectezi cel puțin o specializare (specie de animal)!');
                return;
            }

            if (formData.limbi.length === 0 && formData.limba_noua === '') {
                alert('Te rog să bifezi sau să introduci cel puțin o limbă cunoscută!');
                return;
            }

            try {
                const submitBtn = applyForm.querySelector('.form-submit-btn');
                const originalBtnText = submitBtn.innerText;
                submitBtn.innerText = 'Se salvează...';
                submitBtn.disabled = true;

                const response = await fetch('http://localhost:3000/api/angajati', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData)
                });

                const result = await response.json();

                if (response.ok && result.success) {
                    alert(`Felicitări! Profilul a fost salvat cu succes.\nID Angajat alocat: ${result.id}\nSalariu stabilit: ${result.salariuAlocat} €`);
                    applyForm.reset();

                    if (formData.limba_noua !== '') {
                        window.location.reload();
                    }
                } else {
                    alert('Eroare la salvare: ' + (result.message || 'Verifică consola serverului.'));
                }

                submitBtn.innerText = originalBtnText;
                submitBtn.disabled = false;

            } catch (error) {
                console.error('Eroare de rețea:', error);
                alert('Nu s-a putut conecta la server. Asigură-te că comanda "node js/server.js" rulează!');
            }
        });
    }


    // ========================================================================
    // 4. LOGICA PENTRU CĂUTAREA OPORTUNITĂȚILOR DE SCHIMB DE EXPERIENȚĂ
    // ========================================================================
    const btnCheckExchange = document.getElementById('btnCheckExchange');
    const resultsDiv = document.getElementById('exchangeResults');

    if (btnCheckExchange && resultsDiv) {
        btnCheckExchange.addEventListener('click', async () => {
            const empId = document.getElementById('empIdSearch').value.trim();

            if (!empId) {
                alert('Te rog să introduci ID-ul tău de angajat!');
                return;
            }

            resultsDiv.innerHTML = '<p style="color: var(--accent-gold);">Se caută parteneri compatibili...</p>';

            try {
                const response = await fetch(`http://localhost:3000/api/schimb-experienta/${empId}`);
                const data = await response.json();

                if (response.ok && data.success) {
                    let html = '<div style="display: grid; gap: 15px; text-align: left;">';

                    data.matches.forEach(m => {
                        html += `
                            <div style="background: #FFFFFF; color: #333333; padding: 20px; border-radius: 10px; border-left: 5px solid #385E32; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
                                <h3 style="margin-bottom: 8px; color: #213A1D;">${m.NUME_PARTENER}</h3>
                                <p style="font-size: 14px; margin-bottom: 4px;"><strong>Funcție:</strong> ${m.FUNCTIE}</p>
                                <p style="font-size: 14px; margin-bottom: 10px;"><strong>Locație:</strong> ${m.NUME_ADAPOST} (${m.ORAS}, ${m.TARA})</p>
                                <span style="font-size: 11px; font-weight: 600; background-color: #E8F5E9; color: #2E7D32; padding: 4px 10px; border-radius: 20px;">
                                    ✓ Potrivire Limbă & Specializare
                               </span>
                            </div>
                        `;
                    });

                    html += '</div>';
                    resultsDiv.innerHTML = html;
                } else {
                    resultsDiv.innerHTML = `
                        <div style="padding: 15px; background-color: rgba(255, 255, 255, 0.08); border-radius: 8px; color: #FFF4D9; font-size: 14px;">
                            ℹ️ ${data.message || 'Nu s-au găsit parteneri.'}
                        </div>
                    `;
                }
            } catch (error) {
                console.error('Eroare API Exchange:', error);
                resultsDiv.innerHTML = '<p style="color: #FF8A80; font-size: 14px;">Eroare de conectare la serverul de baze de date.</p>';
            }
        });
    }

});

// ========================================================================
// FUNCȚII GLOBALE PENTRU UI (Afișare / Ascundere Modale)
// ========================================================================
window.showModal = (id) => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'block';
};

window.closeModal = (id) => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
};