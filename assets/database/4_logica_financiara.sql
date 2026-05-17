-- ==========================================
-- 1. SPECIFICAȚIA PACHETULUI (Ce conține)
-- ==========================================
CREATE OR REPLACE PACKAGE PKG_MANAGEMENT_FINANCIAR AS
    -- Funcție pentru calculul balanței curente a unui adăpost
    FUNCTION obtine_balanta(p_id_adapost NUMBER) RETURN NUMBER;

    -- Procedură pentru înregistrarea unei donații
    PROCEDURE inregistreaza_donatie(p_id_adapost NUMBER, p_suma NUMBER, p_descriere VARCHAR2);

    -- Procedură cu CURSOR pentru plata tuturor salariilor
    PROCEDURE plateste_salarii(p_id_adapost NUMBER);
END PKG_MANAGEMENT_FINANCIAR;
/

-- ==========================================
-- 2. CORPUL PACHETULUI (Implementarea)
-- ==========================================
CREATE OR REPLACE PACKAGE BODY PKG_MANAGEMENT_FINANCIAR AS

    -- Implementare Funcție Balanță
    FUNCTION obtine_balanta(p_id_adapost NUMBER) RETURN NUMBER IS
        -- PRAGMA este vitală aici pentru a putea folosi funcția într-un Trigger
        -- fără a primi eroarea clasică de "Mutating Table" (ORA-04091).
        PRAGMA AUTONOMOUS_TRANSACTION;
        v_venituri   NUMBER := 0;
        v_cheltuieli NUMBER := 0;
    BEGIN
        -- Calculăm suma tuturor veniturilor
        SELECT NVL(SUM(suma), 0)
        INTO v_venituri
        FROM tranzactii_financiare
        WHERE id_adapost = p_id_adapost
          AND tip_tranzactie LIKE 'VENIT%';

-- Calculăm suma tuturor cheltuielilor
        SELECT NVL(SUM(suma), 0)
        INTO v_cheltuieli
        FROM tranzactii_financiare
        WHERE id_adapost = p_id_adapost
          AND tip_tranzactie LIKE 'CHELTUIALA%';

        RETURN (v_venituri - v_cheltuieli);
    END obtine_balanta;

    -- Implementare Procedură Donație
    PROCEDURE inregistreaza_donatie(p_id_adapost NUMBER, p_suma NUMBER, p_descriere VARCHAR2) IS
    BEGIN
        IF p_suma <= 0 THEN
            RAISE_APPLICATION_ERROR(-20002, 'Suma donată trebuie să fie strict pozitivă.');
        END IF;

        INSERT INTO tranzactii_financiare (id_adapost, tip_tranzactie, suma, descriere)
        VALUES (p_id_adapost, 'VENIT_DONATIE', p_suma, NVL(p_descriere, 'Donație anonimă'));

        COMMIT;
    END inregistreaza_donatie;

    -- Implementare Procedură Salarii (Folosește un CURSOR)
    PROCEDURE plateste_salarii(p_id_adapost NUMBER) IS
        -- Definim un cursor care extrage toți angajații activi dintr-un adăpost
        CURSOR c_angajati IS
            SELECT nume, prenume, salariu
            FROM angajati
            WHERE id_adapost = p_id_adapost
              AND salariu > 0;
        v_salarii_platite NUMBER := 0;
    BEGIN
        -- Parcurgem angajații cu un loop
        FOR v_angajat IN c_angajati
            LOOP
                INSERT INTO tranzactii_financiare (id_adapost, tip_tranzactie, suma, descriere)
                VALUES (p_id_adapost,
                        'CHELTUIALA_SALARIU',
                        v_angajat.salariu,
                        'Plată salariu pt. ' || v_angajat.nume || ' ' || v_angajat.prenume);
                v_salarii_platite := v_salarii_platite + 1;
            END LOOP;

        IF v_salarii_platite = 0 THEN
            RAISE_APPLICATION_ERROR(-20003, 'Nu s-au găsit angajați cu salariu valid în acest adăpost.');
        END IF;

        COMMIT;
    END plateste_salarii;

END PKG_MANAGEMENT_FINANCIAR;
/

CREATE OR REPLACE TRIGGER trg_failsafe_buget
    BEFORE INSERT
    ON tranzactii_financiare
    FOR EACH ROW
DECLARE
    v_balanta_curenta NUMBER;
BEGIN
    -- Ne interesează să verificăm DOAR tranzacțiile de tip cheltuială
    IF :NEW.tip_tranzactie LIKE 'CHELTUIALA%' THEN

        -- Apelăm funcția din pachet
        v_balanta_curenta := PKG_MANAGEMENT_FINANCIAR.obtine_balanta(:NEW.id_adapost);

        -- Dacă cheltuiala nouă duce balanța pe minus, blocăm totul!
        IF (v_balanta_curenta - :NEW.suma) < 0 THEN
            RAISE_APPLICATION_ERROR(
                    -20005,
                    'Tranzacție BLOCATĂ! Fonduri insuficiente. ' ||
                    'Balanța actuală este de doar ' || v_balanta_curenta || ' Lei, ' ||
                    'iar cheltuiala solicitată este de ' || :NEW.suma || ' Lei.'
            );
        END IF;

    END IF;
END;
/