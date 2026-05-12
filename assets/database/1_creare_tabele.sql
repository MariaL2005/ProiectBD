-- ====================================================================
-- SCRIPT CREARE TABELE - PROIECT ADAPOSTURI
-- ====================================================================

-- Stergem tot ce exista inainte ca sa putem rula scriptul de mai multe ori
BEGIN
    FOR cur IN (SELECT table_name FROM user_tables)
        LOOP
            EXECUTE IMMEDIATE 'DROP TABLE ' || cur.table_name || ' CASCADE CONSTRAINTS';
        END LOOP;
    FOR cur IN (SELECT sequence_name FROM user_sequences)
        LOOP
            EXECUTE IMMEDIATE 'DROP SEQUENCE ' || cur.sequence_name;
        END LOOP;
END;
/

-- Secvente pentru ID-uri (ca sa se incrementeze singure)
CREATE SEQUENCE seq_tari;
CREATE SEQUENCE seq_orase;
CREATE SEQUENCE seq_adaposturi;
CREATE SEQUENCE seq_angajati;
CREATE SEQUENCE seq_custi;
CREATE SEQUENCE seq_animale;
CREATE SEQUENCE seq_interventii;
CREATE SEQUENCE seq_persoane;
CREATE SEQUENCE seq_istoric;
CREATE SEQUENCE seq_tranzactii;

-- 1. Tabel Tari
CREATE TABLE tari
(
    id   NUMBER DEFAULT seq_tari.NEXTVAL PRIMARY KEY,
    nume VARCHAR2(100) NOT NULL UNIQUE
);

-- 2. Tabel Orase
CREATE TABLE orase
(
    id      NUMBER DEFAULT seq_orase.NEXTVAL PRIMARY KEY,
    id_tara NUMBER        NOT NULL REFERENCES tari (id),
    nume    VARCHAR2(100) NOT NULL
);

-- 3. Tabel Adaposturi
CREATE TABLE adaposturi
(
    id                NUMBER DEFAULT seq_adaposturi.NEXTVAL PRIMARY KEY,
    id_oras           NUMBER        NOT NULL REFERENCES orase (id),
    nume              VARCHAR2(150) NOT NULL,
    strada            VARCHAR2(200),
    capacitate_maxima NUMBER CHECK (capacitate_maxima > 0)
);

-- 4. Tabel Conexiuni intre adaposturi
CREATE TABLE conexiuni_adaposturi
(
    id_adapost1 NUMBER REFERENCES adaposturi (id),
    id_adapost2 NUMBER REFERENCES adaposturi (id),
    distanta_km NUMBER,
    PRIMARY KEY (id_adapost1, id_adapost2)
);

-- 5. Tabel Angajati
CREATE TABLE angajati
(
    id         NUMBER DEFAULT seq_angajati.NEXTVAL PRIMARY KEY,
    id_adapost NUMBER        NOT NULL REFERENCES adaposturi (id),
    nume       VARCHAR2(100) NOT NULL,
    prenume    VARCHAR2(100) NOT NULL,
    telefon    VARCHAR2(20),
    functie    VARCHAR2(50)  CHECK (functie IN ('MEDIC', 'INGRIJITOR', 'VOLUNTAR', 'EXTERN')),
    salariu    NUMBER
);

-- 6. Tabel Specializari (ce animale stie fiecare angajat)
CREATE TABLE specializari_angajati
(
    id_angajat NUMBER REFERENCES angajati (id),
    specie     VARCHAR2(100),
    PRIMARY KEY (id_angajat, specie)
);

-- 7. Tabel Custi
CREATE TABLE custi
(
    id               NUMBER DEFAULT seq_custi.NEXTVAL PRIMARY KEY,
    id_adapost       NUMBER        NOT NULL REFERENCES adaposturi (id),
    capacitate       NUMBER        NOT NULL,
    specie_destinata VARCHAR2(100) NOT NULL
);

-- 8. Tabel Animale
CREATE TABLE animale
(
    id           NUMBER       DEFAULT seq_animale.NEXTVAL PRIMARY KEY,
    id_cusca     NUMBER        NOT NULL REFERENCES custi (id),
    nume         VARCHAR2(100) NOT NULL,
    specie       VARCHAR2(100) NOT NULL,
    rasa         VARCHAR2(100),
    data_nastere DATE,
    data_intrare DATE         DEFAULT SYSDATE,
    status       VARCHAR2(30) DEFAULT 'DISPONIBIL',
    poza_url     VARCHAR2(500)
);

-- 9. Tabel Interventii Medicale
CREATE TABLE interventii_medicale
(
    id               NUMBER DEFAULT seq_interventii.NEXTVAL PRIMARY KEY,
    id_animal        NUMBER        NOT NULL REFERENCES animale (id),
    tipul            VARCHAR2(100) NOT NULL,
    descriere        VARCHAR2(500),
    data_interventie DATE   DEFAULT SYSDATE,
    cost             NUMBER
);

-- 10. Tabel Persoane (Adoptatori/Donatori)
CREATE TABLE persoane
(
    id      NUMBER DEFAULT seq_persoane.NEXTVAL PRIMARY KEY,
    nume    VARCHAR2(100) NOT NULL,
    prenume VARCHAR2(100) NOT NULL,
    telefon VARCHAR2(20) UNIQUE,
    email   VARCHAR2(150),
    adresa  VARCHAR2(300)
);

-- 11. Tabel Istoric Adoptii
CREATE TABLE istoric_adoptii
(
    id              NUMBER DEFAULT seq_istoric.NEXTVAL PRIMARY KEY,
    id_animal       NUMBER NOT NULL REFERENCES animale (id),
    id_persoana     NUMBER NOT NULL REFERENCES persoane (id),
    data_adoptie    DATE   DEFAULT SYSDATE,
    data_returnare  DATE,
    motiv_returnare VARCHAR2(500)
);

-- 12. Tabel Tranzactii (Bani)
CREATE TABLE tranzactii_financiare
(
    id              NUMBER DEFAULT seq_tranzactii.NEXTVAL PRIMARY KEY,
    id_adapost      NUMBER NOT NULL REFERENCES adaposturi (id),
    tip_tranzactie  VARCHAR2(50),
    suma            NUMBER NOT NULL,
    data_tranzactie DATE   DEFAULT SYSDATE,
    descriere       VARCHAR2(250)
);

COMMIT;