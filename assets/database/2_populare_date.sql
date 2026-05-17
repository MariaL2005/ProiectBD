-- =========================================================================
-- SCRIPT 2: POPULARE AUTOMATIZATĂ (CU COMMIT INTERMEDIAR PENTRU AUTONOMOUS TRANSACTION)
-- =========================================================================

BEGIN
    -- Curățăm tabelele în ordine inversă pentru a proteja cheile străine.
    DELETE FROM istoric_adoptii WHERE 1=1;
    DELETE FROM interventii_medicale WHERE 1=1;
    DELETE FROM tranzactii_financiare WHERE 1=1;
    DELETE FROM animale WHERE 1=1;
    DELETE FROM persoane WHERE 1=1;
    DELETE FROM custi WHERE 1=1;
    DELETE FROM specializari_angajati WHERE 1=1;
    DELETE FROM limbi_angajati WHERE 1=1;
    DELETE FROM angajati WHERE 1=1;
    DELETE FROM conexiuni_adaposturi WHERE 1=1;
    DELETE FROM adaposturi WHERE 1=1;
    DELETE FROM orase WHERE 1=1;
    DELETE FROM limbi_tari WHERE 1=1;
    DELETE FROM tari WHERE 1=1;
    DELETE FROM limbi WHERE 1=1;
    COMMIT;
END;
/

DECLARE
    TYPE t_str_array IS VARRAY(15) OF VARCHAR2(100);

    v_tari_nume t_str_array := t_str_array('Romania', 'Franta', 'Germania', 'Italia', 'Spania', 'Austria', 'Olanda', 'Cehia', 'Polonia', 'Ungaria', 'Belgia', 'Portugalia', 'Grecia', 'Irlanda', 'Danemarca');
    v_orase_nume t_str_array := t_str_array('Bucuresti', 'Paris', 'Berlin', 'Roma', 'Madrid', 'Viena', 'Amsterdam', 'Praga', 'Varsovia', 'Budapesta', 'Bruxelles', 'Lisabona', 'Atena', 'Dublin', 'Copenhaga');
    v_adap_nume t_str_array := t_str_array('Speranta', 'Les Amis', 'Tierheim', 'Amici di Roma', 'Refugio', 'Wiener Pfoten', 'Amsterdam Paws', 'Prague Rescue', 'Warsaw Pets', 'Budapest Hope', 'Brussel Shelter', 'Porto Seguro', 'Athena Rescue', 'Dublin Animals', 'Danish Hope');
    v_limbi_nume t_str_array := t_str_array('Romana', 'Franceza', 'Germana', 'Italiana', 'Spaniola', 'Austriaca', 'Olandeza', 'Ceha', 'Poloneza', 'Maghiara', 'Flamanda', 'Portugheza', 'Greaca', 'Irlandeza', 'Daneza');
    v_specii t_str_array := t_str_array('Caine', 'Pisica', 'Caine', 'Pisica', 'Caine', 'Pasare', 'Pisica', 'Caine', 'Caine', 'Pisica', 'Pasare', 'Caine', 'Pisica', 'Caine', 'Pisica');

    TYPE t_num_array IS TABLE OF NUMBER INDEX BY BINARY_INTEGER;
    arr_tari t_num_array;
    arr_orase t_num_array;
    arr_adaposturi t_num_array;
    arr_angajati t_num_array;
    arr_custi t_num_array;
    arr_persoane t_num_array;
    arr_limbi t_num_array;
    arr_animale t_num_array;

    v_functie VARCHAR2(50);
    v_tranzactie VARCHAR2(50);

BEGIN
    -- PASUL 1: Inserăm entitățile de bază
    FOR i IN 1..15 LOOP
            INSERT INTO limbi (nume) VALUES (v_limbi_nume(i)) RETURNING id INTO arr_limbi(i);
            INSERT INTO tari (nume) VALUES (v_tari_nume(i)) RETURNING id INTO arr_tari(i);
            INSERT INTO orase (id_tara, nume) VALUES (arr_tari(i), v_orase_nume(i)) RETURNING id INTO arr_orase(i);

            INSERT INTO adaposturi (id_oras, nume, strada, capacitate_maxima, accepta_vizite)
            VALUES (arr_orase(i), v_adap_nume(i), 'Street ' || i, 100 + (i*10), 'DA') RETURNING id INTO arr_adaposturi(i);

            IF MOD(i, 3) = 0 THEN v_functie := 'MEDIC';
            ELSIF MOD(i, 3) = 1 THEN v_functie := 'INGRIJITOR';
            ELSE v_functie := 'VOLUNTAR'; END IF;

            INSERT INTO angajati (id_adapost, nume, prenume, telefon, functie, salariu, data_angajarii)
            VALUES (arr_adaposturi(i), 'Nume_'||i, 'Prenume_'||i, '0700111'||LPAD(i, 3, '0'), v_functie, 3000 + (i*50), SYSDATE - (i*10)) RETURNING id INTO arr_angajati(i);

            INSERT INTO custi (id_adapost, capacitate, specie_destinata)
            VALUES (arr_adaposturi(i), 5, v_specii(i)) RETURNING id INTO arr_custi(i);

            INSERT INTO persoane (nume, prenume, telefon, email, adresa)
            VALUES ('Adoptator_'||i, 'Familia_'||i, '0722333'||LPAD(i, 3, '0'), 'client'||i||'@test.com', v_orase_nume(i)) RETURNING id INTO arr_persoane(i);
        END LOOP;

    -- PASUL 2: Inserăm tabelele de legătură și restul datelor
    FOR i IN 1..15 LOOP
            INSERT INTO limbi_tari (id_tara, id_limba) VALUES (arr_tari(i), arr_limbi(i));
            INSERT INTO limbi_angajati (id_angajat, id_limba) VALUES (arr_angajati(i), arr_limbi(i));
            INSERT INTO specializari_angajati (id_angajat, specie) VALUES (arr_angajati(i), v_specii(i));

            IF i < 15 THEN
                INSERT INTO conexiuni_adaposturi (id_adapost1, id_adapost2, distanta_km) VALUES (arr_adaposturi(i), arr_adaposturi(i+1), 50 + i);
            ELSE
                INSERT INTO conexiuni_adaposturi (id_adapost1, id_adapost2, distanta_km) VALUES (arr_adaposturi(15), arr_adaposturi(1), 120);
            END IF;

            -- ========================================================
            -- FIX PENTRU TRIGGER: Acordăm un buget de start și îi dăm COMMIT IMEDIAT!
            -- ========================================================
            INSERT INTO tranzactii_financiare (id_adapost, tip_tranzactie, suma, descriere)
            VALUES (arr_adaposturi(i), 'VENIT_GRANT', 10000, 'Buget initial stat');

            COMMIT; -- Salvează banii instant ca să îi poată "vedea" trigger-ul autonom mai jos!

            -- Acum putem simula tranzacții random (Cheltuieli/Donații) fără probleme
            IF MOD(i, 2) = 0 THEN v_tranzactie := 'VENIT_DONATIE'; ELSE v_tranzactie := 'CHELTUIALA_MEDICALA'; END IF;
            INSERT INTO tranzactii_financiare (id_adapost, tip_tranzactie, suma, descriere)
            VALUES (arr_adaposturi(i), v_tranzactie, 500 + (i*10), 'Tranzactie curenta');

            -- Inserăm animale și adopții
            INSERT INTO animale (id_cusca, nume, specie, rasa, data_nastere, status)
            VALUES (arr_custi(i), 'Animal_'||i, v_specii(i), 'Comuna', SYSDATE - 100, 'DISPONIBIL') RETURNING id INTO arr_animale(i);

            INSERT INTO animale (id_cusca, nume, specie, rasa, data_nastere, status)
            VALUES (arr_custi(i), 'Animal_Rezerva_'||i, v_specii(i), 'Comuna', SYSDATE - 200, 'DISPONIBIL');

            INSERT INTO interventii_medicale (id_animal, tipul, descriere, cost)
            VALUES (arr_animale(i), 'Vaccin', 'Procedura standard', 150 + i);

            INSERT INTO istoric_adoptii (id_animal, id_persoana, data_adoptie)
            VALUES (arr_animale(i), arr_persoane(i), SYSDATE);

        END LOOP;

    COMMIT;
    DBMS_OUTPUT.PUT_LINE('Scriptul a rulat cu succes! Toate adăposturile au primit buget de start și tabelele sunt pline.');
END;
/