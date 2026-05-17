-- =========================================================================
-- SCRIPT NUMĂRUL 5: CONFIGURARE STATISTICI ȘI PREDICȚII FINANCIARE (FORECASTING)
-- =========================================================================

-- PASUL IMPRESCINDIBIL: Ștergem mai întâi tabelul dacă există deja (Safe Drop)
-- Folosim PL/SQL nativ pentru ca scriptul să nu dea eroare dacă tabelul nu este găsit la prima rulare
BEGIN
    EXECUTE IMMEDIATE 'DROP TABLE costuri_intretinere_specii CASCADE CONSTRAINTS';
EXCEPTION
    WHEN OTHERS THEN
        -- ORA-00942 înseamnă că tabelul nu există. Dacă e această eroare, o ignorăm elegant.
        IF SQLCODE != -942 THEN
            RAISE;
        END IF;
END;
/

-- 1. Creăm tabelul-dicționar cu normele de consum de hrană pe specii
CREATE TABLE costuri_intretinere_specii (
                                            specie VARCHAR2(100) PRIMARY KEY,
                                            hrana_kg_pe_luna NUMBER NOT NULL,
                                            cost_medicamente_luna NUMBER NOT NULL
);

-- 2. Populăm dicționarul cu datele de referință implicite
INSERT INTO costuri_intretinere_specii VALUES ('Caine', 15, 50);
INSERT INTO costuri_intretinere_specii VALUES ('Pisica', 5, 30);
INSERT INTO costuri_intretinere_specii VALUES ('Pasare', 1, 10);
COMMIT;

-- 3. Creăm sau înlocuim VIEW-ul complex, imun la majuscule sau lipsa potrivirilor în dicționar
CREATE OR REPLACE VIEW v_buget_estimat_lunar AS
WITH medie_medicala_istoric AS (
    -- Pasul A: Calculăm media din tabelul de intervenții medicale brute, curățând textul
    SELECT UPPER(TRIM(a.specie)) as specie, AVG(im.cost) as cost_mediu_interventie
    FROM interventii_medicale im
             JOIN animale a ON im.id_animal = a.id
    GROUP BY UPPER(TRIM(a.specie))
),
     costuri_animale AS (
         -- Pasul B: Calculăm hrana și medicamentele predictive pentru animalele prezente (status DISPONIBIL)
         SELECT
             c.id_adapost,
             -- Dacă specia nu e în dicționar, punem o valoare implicită (10kg * 15 lei/kg) ca să nu ignore animalul
             SUM(a.nr_animale * NVL(cs.hrana_kg_pe_luna, 10) * 15) as cost_hrana_total,

             -- Fallback: media din istoricul real -> valoarea din dicționar -> 30 lei implicită
             SUM(a.nr_animale * NVL(mmi.cost_mediu_interventie, NVL(cs.cost_medicamente_luna, 30))) as cost_meds_total
         FROM (
                  -- Curățăm statusul și specia direct la selectare ca să fim siguri că le prindem
                  SELECT id_cusca, UPPER(TRIM(specie)) as specie, COUNT(*) as nr_animale
                  FROM animale
                  WHERE UPPER(TRIM(status)) = 'DISPONIBIL'
                  GROUP BY id_cusca, UPPER(TRIM(specie))
              ) a
                  JOIN custi c ON a.id_cusca = c.id

             -- LEFT JOIN ne asigură că dacă o specie nu are preț pus în dicționar, animalul tot este pus la socoteală!
                  LEFT JOIN costuri_intretinere_specii cs ON a.specie = UPPER(TRIM(cs.specie))
                  LEFT JOIN medie_medicala_istoric mmi ON a.specie = mmi.specie
         GROUP BY c.id_adapost
     ),
     costuri_salarii AS (
         -- Pasul C: Extragem suma salariilor brute per adăpost din tabelul angajati
         SELECT id_adapost, SUM(salariu) as total_salarii
         FROM angajati
         GROUP BY id_adapost
     )
-- Pasul D: Îmbinăm toate sursele financiare într-un raport predictiv consolidat
SELECT
    ad.id as id_adapost,
    ad.nume as nume_adapost,
    NVL(ca.cost_hrana_total, 0) as estimat_hrana,
    NVL(ca.cost_meds_total, 0) as estimat_medical,
    NVL(cs.total_salarii, 0) as estimat_salarii,
    (NVL(ca.cost_hrana_total, 0) + NVL(ca.cost_meds_total, 0) + NVL(cs.total_salarii, 0)) as total_luna_viitoare
FROM adaposturi ad
         LEFT JOIN costuri_animale ca ON ad.id = ca.id_adapost
         LEFT JOIN costuri_salarii cs ON ad.id = cs.id_adapost;
/