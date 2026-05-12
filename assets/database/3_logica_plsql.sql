-- ====================================================================
-- SCRIPT 3: LOGICA AVANSATA PL/SQL (TRIGGERE SI PROCEDURI STOCATE)
-- ====================================================================
-- --------------------------------------------------------------------
-- 1. TRIGGER: Validare capacitate maximă cușcă la adăugarea unui animal
-- --------------------------------------------------------------------
CREATE OR REPLACE TRIGGER trg_validare_capacitate_cusca
BEFORE INSERT ON animale
FOR EACH ROW
DECLARE
v_nr_animale NUMBER;
    v_capacitate NUMBER;
BEGIN
    -- Numărăm câte animale active sunt deja în acea cușcă
SELECT COUNT(*) INTO v_nr_animale
FROM animale
WHERE id_cusca = :NEW.id_cusca AND status <> 'ADOPTAT';

-- Aflăm capacitatea maximă a cuștii
SELECT capacitate INTO v_capacitate
FROM custi
WHERE id = :NEW.id_cusca;

-- Dacă este plină, blocăm inserarea aruncând o eroare personalizată
IF v_nr_animale >= v_capacitate THEN
        RAISE_APPLICATION_ERROR(-20001, 'Eroare: Cusca selectata a atins capacitatea maxima (' || v_capacitate || ' animale)!');
END IF;
END;
/

-- --------------------------------------------------------------------
-- 2. TRIGGER: Actualizare automată status animal la adopție
-- --------------------------------------------------------------------
CREATE OR REPLACE TRIGGER trg_update_status_adoptie
AFTER INSERT ON istoric_adoptii
FOR EACH ROW
BEGIN
    -- Când se înregistrează o adopție, trecem automat animalul în status 'ADOPTAT'
UPDATE animale
SET status = 'ADOPTAT'
WHERE id = :NEW.id_animal;
END;
/


-- --------------------------------------------------------------------
-- 3. PROCEDURĂ STOCATĂ AVANSATĂ: Algoritm Matchmaking Schimb de Experiență
-- --------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE gaseste_schimb_experienta(p_id_angajat NUMBER)
IS
    v_nume_complet VARCHAR2(200);
    v_functie      angajati.functie%TYPE;
    v_id_adapost   angajati.id_adapost%TYPE;
    v_vechime_zile NUMBER;
    v_gasit_match  BOOLEAN := FALSE;
BEGIN
    DBMS_OUTPUT.PUT_LINE('====================================================');
    DBMS_OUTPUT.PUT_LINE('   CAUTARE PARTENERI PENTRU SCHIMB DE EXPERIENTA    ');
    DBMS_OUTPUT.PUT_LINE('====================================================');

    -- 1. Preluăm datele de bază ale angajatului și calculăm vechimea
BEGIN
SELECT nume || ' ' || prenume, functie, id_adapost, TRUNC(SYSDATE - data_angajarii)
INTO v_nume_complet, v_functie, v_id_adapost, v_vechime_zile
FROM angajati
WHERE id = p_id_angajat;
EXCEPTION
        WHEN NO_DATA_FOUND THEN
            DBMS_OUTPUT.PUT_LINE('Eroare: Angajatul cu ID-ul ' || p_id_angajat || ' nu exista in baza de date.');
            RETURN;
END;

    DBMS_OUTPUT.PUT_LINE('Angajat candidat: ' || v_nume_complet || ' (' || v_functie || ')');
    DBMS_OUTPUT.PUT_LINE('Vechime in adapost: ' || v_vechime_zile || ' zile.');

    -- Regula de vechime: minim 180 de zile (aprox. 6 luni)
    IF v_vechime_zile < 180 THEN
        DBMS_OUTPUT.PUT_LINE('❌ Respins: Angajatul nu are vechimea minima necesara de 180 de zile pentru a pleca in schimburi.');
        RETURN;
END IF;

    DBMS_OUTPUT.PUT_LINE('Criterii indeplinite. Se cauta potriviri in alte adaposturi...');
    DBMS_OUTPUT.PUT_LINE('----------------------------------------------------');

    -- 2. Căutăm candidați compatibili din alte adăposturi
FOR rec IN (
        SELECT DISTINCT
            a_cand.id AS id_partener,
            a_cand.nume || ' ' || a_cand.prenume AS nume_partener,
            ad_dest.nume AS nume_adapost_dest,
            o_dest.nume AS nume_oras,
            t_dest.nume AS nume_tara
        FROM angajati a_cand
        JOIN adaposturi ad_dest ON a_cand.id_adapost = ad_dest.id
        JOIN orase o_dest ON ad_dest.id_oras = o_dest.id
        JOIN tari t_dest ON o_dest.id_tara = t_dest.id
        WHERE a_cand.id <> p_id_angajat
          -- Criteriul 1: Adăpostul destinație trebuie să fie diferit și să accepte vizite
          AND ad_dest.id <> v_id_adapost
          AND ad_dest.accepta_vizite = 'DA'
          -- Criteriul 2: Funcția trebuie să fie identică (Medic cu Medic, etc.)
          AND a_cand.functie = v_functie
          -- Criteriul 3: Compatibilitate Lingvistică (Angajatul nostru știe o limbă vorbită în țara destinație)
          AND EXISTS (
              SELECT 1 FROM limbi_angajati la
              JOIN limbi_tari lt ON la.id_limba = lt.id_limba
              WHERE la.id_angajat = p_id_angajat AND lt.id_tara = t_dest.id
          )
          -- Criteriul 4: Compatibilitate Specializare (Au cel puțin o specie de animale în comun)
          AND EXISTS (
              SELECT 1 FROM specializari_angajati sa1
              JOIN specializari_angajati sa2 ON sa1.specie = sa2.specie
              WHERE sa1.id_angajat = p_id_angajat AND sa2.id_angajat = a_cand.id
          )
    ) LOOP
        v_gasit_match := TRUE;
        DBMS_OUTPUT.PUT_LINE('✅ POTRIVIRE IDEALA GASITA:');
        DBMS_OUTPUT.PUT_LINE('   -> Destinatie: ' || rec.nume_adapost_dest || ' (' || rec.nume_oras || ', ' || rec.nume_tara || ')');
        DBMS_OUTPUT.PUT_LINE('   -> Partener de schimb: ' || rec.nume_partener);
        DBMS_OUTPUT.PUT_LINE('   -> Motiv: Aceeasi functie, limba compatibila si specializari comune.');
        DBMS_OUTPUT.PUT_LINE('----------------------------------------------------');
END LOOP;

    IF NOT v_gasit_match THEN
        DBMS_OUTPUT.PUT_LINE('⚠️ Nu s-a gasit niciun partener compatibil in acest moment (lipsa potrivire limba/functie/specializare).');
END IF;

    DBMS_OUTPUT.PUT_LINE('====================================================');
END;
/

-- Procedură care returnează oportunitățile de schimb printr-un cursor
CREATE OR REPLACE PROCEDURE get_exchange_opportunities(
    p_emp_id IN NUMBER,
    p_cursor OUT SYS_REFCURSOR
) AS
BEGIN
    OPEN p_cursor FOR
        SELECT DISTINCT
            a_cand.nume || ' ' || a_cand.prenume AS NUME_PARTENER,
            ad_dest.nume AS NUME_ADAPOST,
            o_dest.nume AS ORAS,
            t_dest.nume AS TARA,
            a_cand.functie AS FUNCTIE
        FROM angajati a_curr
                 JOIN angajati a_cand ON a_cand.functie = a_curr.functie AND a_cand.id <> a_curr.id
                 JOIN adaposturi ad_dest ON a_cand.id_adapost = ad_dest.id
                 JOIN orase o_dest ON ad_dest.id_oras = o_dest.id
                 JOIN tari t_dest ON o_dest.id_tara = t_dest.id
        WHERE a_curr.id = p_emp_id
          AND (SYSDATE - a_curr.data_angajarii) >= 180
          AND ad_dest.accepta_vizite = 'DA'
          AND ad_dest.id <> a_curr.id_adapost
          AND EXISTS (
            SELECT 1 FROM limbi_angajati la
                              JOIN limbi_tari lt ON la.id_limba = lt.id_limba
            WHERE la.id_angajat = a_curr.id AND lt.id_tara = t_dest.id
        )
          AND EXISTS (
            SELECT 1 FROM specializari_angajati sa1
                              JOIN specializari_angajati sa2 ON sa1.specie = sa2.specie
            WHERE sa1.id_angajat = a_curr.id AND sa2.id_angajat = a_cand.id
        );
END;
/

-- 1. Adăugăm o coloană pentru descrierea animalului (pentru pagina de detalii)
ALTER TABLE animale ADD descriere VARCHAR2(1000);

-- 2. Procedură pentru înregistrarea unei returnări
CREATE OR REPLACE PROCEDURE inregistreaza_returnare(
    p_id_animal NUMBER,
    p_motiv VARCHAR2
) AS
BEGIN
    -- Actualizăm istoricul de adopții cu data returnării
    UPDATE istoric_adoptii
    SET data_returnare = SYSDATE,
        motiv_returnare = p_motiv
    WHERE id_animal = p_id_animal AND data_returnare IS NULL;

    -- Schimbăm statusul animalului înapoi în DISPONIBIL
    UPDATE animale
    SET status = 'DISPONIBIL'
    WHERE id = p_id_animal;

    COMMIT;
END;
/