document.addEventListener('DOMContentLoaded', () => {

    // Notice the updated path: 'components/header.html'
    fetch('components/header.html')
        .then(response => response.text())
        .then(data => {
            document.getElementById('header-placeholder').innerHTML = data;
        })
        .catch(error => console.error('Error loading the header:', error));

});

document.addEventListener('DOMContentLoaded', () => {

    // Încărcarea meniului de navigare (deja existentă în fișierul tău)
    fetch('components/header.html')
        .then(response => response.text())
        .then(data => {
            const placeholder = document.getElementById('header-placeholder');
            if (placeholder) placeholder.innerHTML = data;
        })
        .catch(error => console.error('Error loading the header:', error));


    // Logica pentru trimiterea formularului de Angajare/Voluntariat
    const applyForm = document.getElementById('applyForm');
    if (applyForm) {
        applyForm.addEventListener('submit', async (e) => {
            e.preventDefault(); // Oprim reîncărcarea clasică a paginii

            // Colectăm valorile din câmpurile standard
            const formData = {
                prenume: document.getElementById('firstName').value.trim(),
                nume: document.getElementById('lastName').value.trim(),
                email: document.getElementById('email').value.trim(),
                telefon: document.getElementById('phone').value.trim(),
                tip_angajat: document.getElementById('roleType').value,
                id_adapost: document.getElementById('shelter').value,
                functie: document.getElementById('function').value.trim(),
                specializari: [] // Aici punem selecția multiplă
            };

            // Colectăm toate checkbox-urile bifate pentru animale
            const checkboxes = applyForm.querySelectorAll('input[name="specializare"]:checked');
            checkboxes.forEach(cb => {
                formData.specializari.push(cb.value);
            });

            // Validare simplă: cerem măcar o specializare selectată
            if (formData.specializari.length === 0) {
                alert('Te rog să selectezi cel puțin o specializare (specie de animal)!');
                return;
            }

            try {
                // Modificăm textul butonului pe durata procesării
                const submitBtn = applyForm.querySelector('.form-submit-btn');
                const originalBtnText = submitBtn.innerText;
                submitBtn.innerText = 'Se procesează...';
                submitBtn.disabled = true;

                // Trimitem cererea POST către server
                const response = await fetch('http://localhost:3000/api/angajati', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData)
                });

                const result = await response.json();

                if (response.ok && result.success) {
                    alert(`Felicitări! Aplicația a fost înregistrată cu succes.\nSalariu alocat: ${result.salariuAlocat} €`);
                    applyForm.reset(); // Golim formularul
                } else {
                    alert('Eroare: ' + (result.message || 'Nu s-a putut salva în baza de date.'));
                }

                // Restaurăm butonul
                submitBtn.innerText = originalBtnText;
                submitBtn.disabled = false;

            } catch (error) {
                console.error('Eroare de rețea:', error);
                alert('Nu s-a putut conecta la serverul backend. Asigură-te că server.js este pornit!');
            }
        });
    }
});