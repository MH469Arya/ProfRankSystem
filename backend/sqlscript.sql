-- Active: 1769700717965@@127.0.0.1@3306

DROP DATABASE prs_database;
CREATE DATABASE prs_database;

USE prs_database;

CREATE TABLE IF NOT EXISTS depts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    code VARCHAR(20) UNIQUE
)

CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50),
    password_hash VARCHAR(255),
    role ENUM('SUPER_ADMIN', 'DEPT_ADMIN'),
    dept_id INT NULL,
    FOREIGN KEY (dept_id) REFERENCES depts(id)
)

CREATE TABLE IF NOT EXISTS classes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    dept_id INT,
    year ENUM('SE', 'TE', 'BE'),
    division char(1),
    FOREIGN KEY (dept_id) REFERENCES depts(id),
    UNIQUE(dept_id, year, division)
)

CREATE TABLE IF NOT EXISTS proffs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    dept_id INT,
    name VARCHAR(100),
    FOREIGN KEY (dept_id) REFERENCES depts(id)
)

CREATE TABLE IF NOT EXISTS subs(
    id INT PRIMARY KEY AUTO_INCREMENT,
    dept_id INT,
    name VARCHAR(100),
    sem TINYINT,
    FOREIGN KEY (dept_id) REFERENCES depts(id)
)

CREATE TABLE IF NOT EXISTS class_linkings(
    id INT PRIMARY KEY AUTO_INCREMENT,
    class_id INT,
    sub_id INT,
    proff_id INT,
    FOREIGN KEY (class_id) REFERENCES classes(id),
    FOREIGN KEY (sub_id) REFERENCES subs(id),
    FOREIGN KEY (proff_id) REFERENCES proffs(id),
    UNIQUE(class_id, sub_id)
)

INSERT INTO depts (code)
VALUES  ('AIML'), ('CS'), ('DS'); 

INSERT INTO users (username, password_hash, role, dept_id)
VALUES (
    'princi@gmail.com',
    '$2b$10$vfWJC6GowN1rmgsX46vEkuYSqTzfLY5dOHm35HmsOFmsg85KSJzM.',
    'SUPER_ADMIN',
    NULL
);
INSERT INTO users (username, password_hash, role, dept_id)
VALUES (
    'aimlhod@gmail.com',
    '$2b$10$vfWJC6GowN1rmgsX46vEkuYSqTzfLY5dOHm35HmsOFmsg85KSJzM.',
    'DEPT_ADMIN',
    1
);

-- AIML professors
INSERT INTO proffs (dept_id, name) VALUES
(1, 'AIML Prof 1'),
(1, 'AIML Prof 2'),
(1, 'AIML Prof 3'),
(1, 'AIML Prof 4'),
(1, 'AIML Prof 5');

-- CS professors
INSERT INTO proffs (dept_id, name) VALUES
(2, 'CS Prof 1'),
(2, 'CS Prof 2'),
(2, 'CS Prof 3'),
(2, 'CS Prof 4'),
(2, 'CS Prof 5');

-- DS professors
INSERT INTO proffs (dept_id, name) VALUES
(3, 'DS Prof 1'),
(3, 'DS Prof 2'),
(3, 'DS Prof 3'),
(3, 'DS Prof 4'),
(3, 'DS Prof 5');

INSERT INTO subs (dept_id, name, sem) VALUES
(1, 'AIML Subject 1', 2),(1, 'AIML Subject 2', 2),(1, 'AIML Subject 3', 2),(1, 'AIML Subject 4', 2),(1, 'AIML Subject 5', 2),
(1, 'AIML Subject 1', 3),(1, 'AIML Subject 2', 3),(1, 'AIML Subject 3', 3),(1, 'AIML Subject 4', 3),(1, 'AIML Subject 5', 3),
(1, 'AIML Subject 1', 4),(1, 'AIML Subject 2', 4),(1, 'AIML Subject 3', 4),(1, 'AIML Subject 4', 4),(1, 'AIML Subject 5', 4),
(1, 'AIML Subject 1', 5),(1, 'AIML Subject 2', 5),(1, 'AIML Subject 3', 5),(1, 'AIML Subject 4', 5),(1, 'AIML Subject 5', 5),
(1, 'AIML Subject 1', 6),(1, 'AIML Subject 2', 6),(1, 'AIML Subject 3', 6),(1, 'AIML Subject 4', 6),(1, 'AIML Subject 5', 6),
(1, 'AIML Subject 1', 7),(1, 'AIML Subject 2', 7),(1, 'AIML Subject 3', 7),(1, 'AIML Subject 4', 7),(1, 'AIML Subject 5', 7),
(1, 'AIML Subject 1', 8),(1, 'AIML Subject 2', 8),(1, 'AIML Subject 3', 8),(1, 'AIML Subject 4', 8),(1, 'AIML Subject 5', 8);

INSERT INTO subs (dept_id, name, sem) VALUES
(2, 'CS Subject 1', 2),(2, 'CS Subject 2', 2),(2, 'CS Subject 3', 2),(2, 'CS Subject 4', 2),(2, 'CS Subject 5', 2),
(2, 'CS Subject 1', 3),(2, 'CS Subject 2', 3),(2, 'CS Subject 3', 3),(2, 'CS Subject 4', 3),(2, 'CS Subject 5', 3),
(2, 'CS Subject 1', 4),(2, 'CS Subject 2', 4),(2, 'CS Subject 3', 4),(2, 'CS Subject 4', 4),(2, 'CS Subject 5', 4),
(2, 'CS Subject 1', 5),(2, 'CS Subject 2', 5),(2, 'CS Subject 3', 5),(2, 'CS Subject 4', 5),(2, 'CS Subject 5', 5),
(2, 'CS Subject 1', 6),(2, 'CS Subject 2', 6),(2, 'CS Subject 3', 6),(2, 'CS Subject 4', 6),(2, 'CS Subject 5', 6),
(2, 'CS Subject 1', 7),(2, 'CS Subject 2', 7),(2, 'CS Subject 3', 7),(2, 'CS Subject 4', 7),(2, 'CS Subject 5', 7),
(2, 'CS Subject 1', 8),(2, 'CS Subject 2', 8),(2, 'CS Subject 3', 8),(2, 'CS Subject 4', 8),(2, 'CS Subject 5', 8);

INSERT INTO subs (dept_id, name, sem) VALUES
(3, 'DS Subject 1', 2),(3, 'DS Subject 2', 2),(3, 'DS Subject 3', 2),(3, 'DS Subject 4', 2),(3, 'DS Subject 5', 2),
(3, 'DS Subject 1', 3),(3, 'DS Subject 2', 3),(3, 'DS Subject 3', 3),(3, 'DS Subject 4', 3),(3, 'DS Subject 5', 3),
(3, 'DS Subject 1', 4),(3, 'DS Subject 2', 4),(3, 'DS Subject 3', 4),(3, 'DS Subject 4', 4),(3, 'DS Subject 5', 4),
(3, 'DS Subject 1', 5),(3, 'DS Subject 2', 5),(3, 'DS Subject 3', 5),(3, 'DS Subject 4', 5),(3, 'DS Subject 5', 5),
(3, 'DS Subject 1', 6),(3, 'DS Subject 2', 6),(3, 'DS Subject 3', 6),(3, 'DS Subject 4', 6),(3, 'DS Subject 5', 6),
(3, 'DS Subject 1', 7),(3, 'DS Subject 2', 7),(3, 'DS Subject 3', 7),(3, 'DS Subject 4', 7),(3, 'DS Subject 5', 7),
(3, 'DS Subject 1', 8),(3, 'DS Subject 2', 8),(3, 'DS Subject 3', 8),(3, 'DS Subject 4', 8),(3, 'DS Subject 5', 8);
