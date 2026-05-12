DECLARE
    -- Liste de date
    TYPE lista_text IS VARRAY(100) OF VARCHAR2(255);
    tari_nume lista_text := lista_text('Romania', 'Germania', 'Franta', 'Italia', 'Spania', 'Olanda', 'Belgia', 'Austria', 'Grecia', 'Polonia');
    orase_ro lista_text := lista_text('Bucuresti', 'Cluj-Napoca', 'Timisoara', 'Iasi', 'Brasov');
    orase_eu lista_text := lista_text('Berlin', 'Paris', 'Roma', 'Madrid', 'Amsterdam');
    nume_fam lista_text := lista_text('Popescu', 'Ionescu', 'Radu', 'Stan', 'Dumitru', 'Lupu');
    prenume_m lista_text := lista_text('Andrei', 'Mihai', 'Alexandru', 'Stefan', 'Cristian');
    nume_animale lista_text := lista_text('Rex', 'Grivei', 'Pufi', 'Tom', 'Azor', 'Mitzi');

    -- Variabile pentru ID-uri
    v_id_romania NUMBER;
    v_id_tara_random NUMBER;
    v_id_oras_random NUMBER;
    v_id_cusca_random NUMBER;
    v_id_adapost_random NUMBER;

    -- Variabile temporare pentru texte
    v_nume_tara VARCHAR2(255);
    v_nume_oras VARCHAR2(255);
    v_nume_fam VARCHAR2(255);
    v_prenume VARCHAR2(255);
    v_nume_pet VARCHAR2(255);
BEGIN
    -- 1. Populare TARI (cu protectie la duplicate)
    FOR i IN 1..tari_nume.COUNT LOOP
            BEGIN
                v_nume_tara := tari_nume(i);
                INSERT INTO tari (nume) VALUES (v_nume_tara);
            EXCEPTION
                WHEN OTHERS THEN NULL; -- Daca tara exista deja, ignoram si trecem mai departe
            END;
        END LOOP;

    -- Aflam ID-ul Romaniei
    SELECT id INTO v_id_romania FROM tari WHERE nume = 'Romania';

    -- 2. Populare ORASE (cu protectie)
    FOR i IN 1..orase_ro.COUNT LOOP
            BEGIN
                v_nume_oras := orase_ro(i);
                INSERT INTO orase (id_tara, nume) VALUES (v_id_romania, v_nume_oras);
            EXCEPTION WHEN OTHERS THEN NULL;
            END;
        END LOOP;

    FOR i IN 1..orase_eu.COUNT LOOP
            BEGIN
                v_nume_oras := orase_eu(i);
                SELECT id INTO v_id_tara_random FROM (SELECT id FROM tari WHERE nume <> 'Romania' ORDER BY DBMS_RANDOM.VALUE()) WHERE ROWNUM = 1;
                INSERT INTO orase (id_tara, nume) VALUES (v_id_tara_random, v_nume_oras);
            EXCEPTION WHEN OTHERS THEN NULL;
            END;
        END LOOP;

    -- 3. Populare ADAPOSTURI
    FOR rec IN (SELECT id, nume FROM orase) LOOP
            BEGIN
                INSERT INTO adaposturi (id_oras, nume, strada, capacitate_maxima)
                VALUES (rec.id, 'Adapost ' || rec.nume, 'Str. Principala nr. ' || TRUNC(DBMS_RANDOM.VALUE(1, 50)), 100);
            EXCEPTION WHEN OTHERS THEN NULL;
            END;
        END LOOP;

    -- 4. Populare CUSTI si ANGAJATI
    FOR i IN 1..20 LOOP
            BEGIN
                SELECT id INTO v_id_adapost_random FROM (SELECT id FROM adaposturi ORDER BY DBMS_RANDOM.VALUE()) WHERE ROWNUM = 1;

                INSERT INTO custi (id_adapost, capacitate, specie_destinata)
                VALUES (v_id_adapost_random, 5, 'Caini');

                v_nume_fam := nume_fam(TRUNC(DBMS_RANDOM.VALUE(0, nume_fam.COUNT)) + 1);
                v_prenume := prenume_m(TRUNC(DBMS_RANDOM.VALUE(0, prenume_m.COUNT)) + 1);

                -- AM MODIFICAT AICI: Inserăm doar coloana functie cu valoarea 'INGRIJITOR'
                INSERT INTO angajati (id_adapost, nume, prenume, functie, salariu)
                VALUES (v_id_adapost_random, v_nume_fam, v_prenume, 'INGRIJITOR', 3500);
            EXCEPTION WHEN OTHERS THEN NULL;
            END;
        END LOOP;

    -- 5. Populare ANIMALE
    FOR i IN 1..20 LOOP
            BEGIN
                SELECT id INTO v_id_cusca_random FROM (SELECT id FROM custi ORDER BY DBMS_RANDOM.VALUE()) WHERE ROWNUM = 1;
                v_nume_pet := nume_animale(TRUNC(DBMS_RANDOM.VALUE(0, nume_animale.COUNT)) + 1);

                INSERT INTO animale (id_cusca, nume, specie, status)
                VALUES (v_id_cusca_random, v_nume_pet, 'Caini', 'DISPONIBIL');
            EXCEPTION WHEN OTHERS THEN NULL;
            END;
        END LOOP;

    COMMIT;
END;
/

-- Inserăm 4 limbi de bază
INSERT INTO limbi (nume) VALUES ('Romana');
INSERT INTO limbi (nume) VALUES ('Engleza');
INSERT INTO limbi (nume) VALUES ('Germana');
INSERT INTO limbi (nume) VALUES ('Franceza');

-- Facem maparea pentru țări (Presupunem că știm ID-urile din popularea anterioară sau le alocăm dinamic)
DECLARE
    v_id_ro NUMBER;
    v_id_de NUMBER;
    v_id_fr NUMBER;
    v_id_en NUMBER;
BEGIN
    -- Preluăm ID-urile limbilor
    SELECT id INTO v_id_ro FROM limbi WHERE nume = 'Romana';
    SELECT id INTO v_id_en FROM limbi WHERE nume = 'Engleza';
    SELECT id INTO v_id_de FROM limbi WHERE nume = 'Germana';
    SELECT id INTO v_id_fr FROM limbi WHERE nume = 'Franceza';

    -- Mapăm România (Română și Engleză ca limbă secundară acceptată în adăposturi)
    FOR rec IN (SELECT id FROM tari WHERE nume = 'Romania') LOOP
            INSERT INTO limbi_tari VALUES (rec.id, v_id_ro);
            INSERT INTO limbi_tari VALUES (rec.id, v_id_en);
        END LOOP;

    -- Mapăm Germania (Germană și Engleză)
    FOR rec IN (SELECT id FROM tari WHERE nume = 'Germania') LOOP
            INSERT INTO limbi_tari VALUES (rec.id, v_id_de);
            INSERT INTO limbi_tari VALUES (rec.id, v_id_en);
        END LOOP;

    -- Mapăm Franța (Franaceză și Engleză)
    FOR rec IN (SELECT id FROM tari WHERE nume = 'Franta') LOOP
            INSERT INTO limbi_tari VALUES (rec.id, v_id_fr);
            INSERT INTO limbi_tari VALUES (rec.id, v_id_en);
        END LOOP;

    -- Alocăm aleatoriu limbi cunoscute și o vechime random (între 10 zile și 3 ani) angajaților existenți
    FOR ang IN (SELECT id FROM angajati) LOOP
            -- Setăm o dată de angajare în trecut
            UPDATE angajati
            SET data_angajarii = SYSDATE - TRUNC(DBMS_RANDOM.VALUE(10, 1000))
            WHERE id = ang.id;

            -- Toți știu engleză (ca să avem match-uri mai ușor)
            INSERT INTO limbi_angajati VALUES (ang.id, v_id_en);

            -- 50% șansă să mai știe și altă limbă random
            IF DBMS_RANDOM.VALUE(0, 1) > 0.5 THEN
                BEGIN
                    INSERT INTO limbi_angajati VALUES (ang.id, TRUNC(DBMS_RANDOM.VALUE(1, 4)));
                EXCEPTION WHEN OTHERS THEN NULL; -- Evităm duplicatele
                END;
            END IF;
        END LOOP;

    COMMIT;
END;
/