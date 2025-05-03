--
-- PostgreSQL database dump
--

-- Dumped from database version 15.10 (Debian 15.10-0+deb12u1)
-- Dumped by pg_dump version 15.10 (Debian 15.10-0+deb12u1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

CREATE ROLE xdatauser;

--
-- Name: orderstatus; Type: TYPE; Schema: public; Owner: xdatauser
--

CREATE TYPE public.orderstatus AS ENUM (
    'Ordered',
    'Shipped',
    'Dispatched',
    'Received'
);


ALTER TYPE public.orderstatus OWNER TO xdatauser;

--
-- Name: paymentmethod; Type: TYPE; Schema: public; Owner: xdatauser
--

CREATE TYPE public.paymentmethod AS ENUM (
    'UPI',
    'Net Banking',
    'Debit Card',
    'Credit Card',
    'Cash on Delivery'
);


ALTER TYPE public.paymentmethod OWNER TO xdatauser;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: xdata_database_connection; Type: TABLE; Schema: public; Owner: xdatauser
--

CREATE TABLE public.xdata_database_connection (
    course_id character varying NOT NULL,
    connection_id integer NOT NULL,
    connection_name character varying,
    database_type character varying DEFAULT 'PostgreSql'::character varying,
    jdbc_url character varying,
    database_user character varying DEFAULT 'testing1'::character varying,
    database_password character varying DEFAULT 'testing1'::character varying,
    test_user character varying,
    test_password character varying,
    database_name character varying(50),
    jdbcdata character varying(100)
);


ALTER TABLE public.xdata_database_connection OWNER TO xdatauser;

--
-- Name: database_connection_connection_id_seq; Type: SEQUENCE; Schema: public; Owner: xdatauser
--

CREATE SEQUENCE public.database_connection_connection_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.database_connection_connection_id_seq OWNER TO xdatauser;

--
-- Name: database_connection_connection_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: xdatauser
--

ALTER SEQUENCE public.database_connection_connection_id_seq OWNED BY public.xdata_database_connection.connection_id;


--
-- Name: xdata_assignment; Type: TABLE; Schema: public; Owner: xdatauser
--

CREATE TABLE public.xdata_assignment (
    course_id character varying(20) NOT NULL,
    assignment_id integer NOT NULL,
    description text,
    starttime timestamp without time zone,
    endtime timestamp without time zone,
    learning_mode boolean DEFAULT false,
    connection_id integer,
    defaultschemaid integer,
    assignmentname character varying(20),
    defaultdsetid text,
    evaluationstatus boolean,
    showmarks boolean,
    softtime timestamp without time zone,
    penalty character varying(20)
);


ALTER TABLE public.xdata_assignment OWNER TO xdatauser;

--
-- Name: xdata_course; Type: TABLE; Schema: public; Owner: xdatauser
--

CREATE TABLE public.xdata_course (
    course_id integer,
    instructor_course_id character varying(30) NOT NULL,
    course_name character varying(100),
    year numeric,
    semester character varying(50),
    description text
);


ALTER TABLE public.xdata_course OWNER TO xdatauser;

--
-- Name: xdata_datasetvalue; Type: TABLE; Schema: public; Owner: xdatauser
--

CREATE TABLE public.xdata_datasetvalue (
    queryid character varying,
    datasetid character varying NOT NULL,
    value character varying,
    tag character varying,
    assignment_id integer NOT NULL,
    question_id integer NOT NULL,
    query_id integer NOT NULL,
    course_id character varying(20) NOT NULL,
    isresultmatch boolean
);


ALTER TABLE public.xdata_datasetvalue OWNER TO xdatauser;

--
-- Name: xdata_detectdataset; Type: TABLE; Schema: public; Owner: xdatauser
--

CREATE TABLE public.xdata_detectdataset (
    user_id character varying,
    queryid character varying(20),
    datasetid character varying(20),
    result text,
    assignment_id integer,
    question_id integer,
    course_id character varying(20)
);


ALTER TABLE public.xdata_detectdataset OWNER TO xdatauser;

--
-- Name: xdata_instructor_query; Type: TABLE; Schema: public; Owner: xdatauser
--

CREATE TABLE public.xdata_instructor_query (
    assignment_id integer NOT NULL,
    question_id integer NOT NULL,
    sql text,
    course_id character varying(20) NOT NULL,
    query_id integer NOT NULL,
    marks integer,
    default_sampledataid text,
    partialmarkinfo text,
    resultondataset text,
    evaluationstatus boolean
);


ALTER TABLE public.xdata_instructor_query OWNER TO xdatauser;

--
-- Name: xdata_lti_credentials; Type: TABLE; Schema: public; Owner: xdatauser
--

CREATE TABLE public.xdata_lti_credentials (
    consumer_key character varying(100),
    secret_key character varying(100),
    requesting_url text NOT NULL,
    lti_id integer
);


ALTER TABLE public.xdata_lti_credentials OWNER TO xdatauser;

--
-- Name: xdata_ltiresponseinfo; Type: TABLE; Schema: public; Owner: xdatauser
--

CREATE TABLE public.xdata_ltiresponseinfo (
    course_id character varying(50) NOT NULL,
    internal_user_id character varying(20) NOT NULL,
    rollnum character varying(50),
    assignment_id numeric NOT NULL,
    sourceid text
);


ALTER TABLE public.xdata_ltiresponseinfo OWNER TO xdatauser;

--
-- Name: xdata_qinfo; Type: TABLE; Schema: public; Owner: xdatauser
--

CREATE TABLE public.xdata_qinfo (
    course_id character varying(20) NOT NULL,
    assignment_id integer NOT NULL,
    question_id integer NOT NULL,
    querytext text,
    correctquery text,
    totalmarks integer,
    learningmode boolean,
    ignoreduplicates boolean,
    matchallqueries boolean,
    query_id integer NOT NULL,
    optionalschemaid integer,
    orderindependent boolean,
    default_sampledataid text,
    equivalence_failed_datasets text,
    equivalencestatus boolean,
    latesubmissionmarks integer,
    scale numeric
);


ALTER TABLE public.xdata_qinfo OWNER TO xdatauser;

--
-- Name: xdata_roles; Type: TABLE; Schema: public; Owner: xdatauser
--

CREATE TABLE public.xdata_roles (
    internal_user_id character varying(25),
    login_user_id character varying(50),
    course_id character varying(20),
    role character varying(50)
);


ALTER TABLE public.xdata_roles OWNER TO xdatauser;

--
-- Name: xdata_sampledata; Type: TABLE; Schema: public; Owner: xdatauser
--

CREATE TABLE public.xdata_sampledata (
    sampledata_id integer NOT NULL,
    schema_id integer,
    course_id character varying(20),
    sample_data_name text,
    sample_data text
);


ALTER TABLE public.xdata_sampledata OWNER TO xdatauser;

--
-- Name: xdata_schemainfo; Type: TABLE; Schema: public; Owner: xdatauser
--

CREATE TABLE public.xdata_schemainfo (
    course_id character varying(20) NOT NULL,
    schema_id integer NOT NULL,
    schema_name character varying(20),
    ddltext text,
    sample_data text,
    sample_data_name character varying(50)
);


ALTER TABLE public.xdata_schemainfo OWNER TO xdatauser;

--
-- Name: xdata_student_log; Type: TABLE; Schema: public; Owner: xdatauser
--

CREATE TABLE public.xdata_student_log (
    course_id character varying(20),
    assignment_id integer,
    question_id integer,
    rollnum text NOT NULL,
    eventtime timestamp without time zone,
    querytext text
);


ALTER TABLE public.xdata_student_log OWNER TO xdatauser;

--
-- Name: xdata_student_queries; Type: TABLE; Schema: public; Owner: xdatauser
--

CREATE TABLE public.xdata_student_queries (
    dbid text,
    queryid text NOT NULL,
    rollnum text NOT NULL,
    querystring text NOT NULL,
    tajudgement boolean,
    verifiedcorrect boolean,
    assignment_id integer NOT NULL,
    question_id integer NOT NULL,
    result text,
    course_id character varying(20) NOT NULL,
    score numeric,
    max_marks numeric,
    markinfo text,
    late_submission_flag boolean,
    isevaluated boolean,
    scaled_score numeric,
    submissiontime timestamp without time zone,
    feedback text,
    manual_score numeric,
    raw_score numeric,
    xdata_score numeric
);


ALTER TABLE public.xdata_student_queries OWNER TO xdatauser;

--
-- Name: xdata_users; Type: TABLE; Schema: public; Owner: xdatauser
--

CREATE TABLE public.xdata_users (
    internal_user_id character varying(20) NOT NULL,
    user_name character varying(100),
    email character varying(100),
    sourceid text,
    password text,
    role character varying(30),
    course_id character varying(20),
    login_user_id character varying(50)
);


ALTER TABLE public.xdata_users OWNER TO xdatauser;

--
-- Name: xdata_views; Type: TABLE; Schema: public; Owner: xdatauser
--

CREATE TABLE public.xdata_views (
    vname text NOT NULL,
    rollnum text NOT NULL,
    viewquery text NOT NULL
);


ALTER TABLE public.xdata_views OWNER TO xdatauser;

--
-- Name: xdata_database_connection connection_id; Type: DEFAULT; Schema: public; Owner: xdatauser
--

ALTER TABLE ONLY public.xdata_database_connection ALTER COLUMN connection_id SET DEFAULT nextval('public.database_connection_connection_id_seq'::regclass);





--
-- Name: database_connection_connection_id_seq; Type: SEQUENCE SET; Schema: public; Owner: xdatauser
--

SELECT pg_catalog.setval('public.database_connection_connection_id_seq', 2, true);


--
-- Name: xdata_assignment xdata_assignment_pkey; Type: CONSTRAINT; Schema: public; Owner: xdatauser
--

ALTER TABLE ONLY public.xdata_assignment
    ADD CONSTRAINT xdata_assignment_pkey PRIMARY KEY (course_id, assignment_id);


--
-- Name: xdata_course xdata_course_pkey; Type: CONSTRAINT; Schema: public; Owner: xdatauser
--

ALTER TABLE ONLY public.xdata_course
    ADD CONSTRAINT xdata_course_pkey PRIMARY KEY (instructor_course_id);


--
-- Name: xdata_database_connection xdata_database_connection_pkey; Type: CONSTRAINT; Schema: public; Owner: xdatauser
--

ALTER TABLE ONLY public.xdata_database_connection
    ADD CONSTRAINT xdata_database_connection_pkey PRIMARY KEY (course_id, connection_id);


--
-- Name: xdata_datasetvalue xdata_datasetvalue_pkey; Type: CONSTRAINT; Schema: public; Owner: xdatauser
--

ALTER TABLE ONLY public.xdata_datasetvalue
    ADD CONSTRAINT xdata_datasetvalue_pkey PRIMARY KEY (course_id, assignment_id, question_id, query_id, datasetid);


--
-- Name: xdata_instructor_query xdata_instructor_query_pkey; Type: CONSTRAINT; Schema: public; Owner: xdatauser
--

ALTER TABLE ONLY public.xdata_instructor_query
    ADD CONSTRAINT xdata_instructor_query_pkey PRIMARY KEY (course_id, assignment_id, question_id, query_id);


--
-- Name: xdata_lti_credentials xdata_lti_credentials_pkey; Type: CONSTRAINT; Schema: public; Owner: xdatauser
--

ALTER TABLE ONLY public.xdata_lti_credentials
    ADD CONSTRAINT xdata_lti_credentials_pkey PRIMARY KEY (requesting_url);


--
-- Name: xdata_ltiresponseinfo xdata_ltiresponseinfo_pkey; Type: CONSTRAINT; Schema: public; Owner: xdatauser
--

ALTER TABLE ONLY public.xdata_ltiresponseinfo
    ADD CONSTRAINT xdata_ltiresponseinfo_pkey PRIMARY KEY (assignment_id, course_id, internal_user_id);


--
-- Name: xdata_qinfo xdata_qinfo_pkey; Type: CONSTRAINT; Schema: public; Owner: xdatauser
--

ALTER TABLE ONLY public.xdata_qinfo
    ADD CONSTRAINT xdata_qinfo_pkey PRIMARY KEY (course_id, assignment_id, question_id, query_id);


--
-- Name: xdata_sampledata xdata_sampledata_pkey; Type: CONSTRAINT; Schema: public; Owner: xdatauser
--

ALTER TABLE ONLY public.xdata_sampledata
    ADD CONSTRAINT xdata_sampledata_pkey PRIMARY KEY (sampledata_id);


--
-- Name: xdata_sampledata xdata_sampledata_sample_data_name_key; Type: CONSTRAINT; Schema: public; Owner: xdatauser
--

ALTER TABLE ONLY public.xdata_sampledata
    ADD CONSTRAINT xdata_sampledata_sample_data_name_key UNIQUE (sample_data_name);


--
-- Name: xdata_schemainfo xdata_schemainfo_pkey; Type: CONSTRAINT; Schema: public; Owner: xdatauser
--

ALTER TABLE ONLY public.xdata_schemainfo
    ADD CONSTRAINT xdata_schemainfo_pkey PRIMARY KEY (course_id, schema_id);


--
-- Name: xdata_student_queries xdata_student_queries_pkey; Type: CONSTRAINT; Schema: public; Owner: xdatauser
--

ALTER TABLE ONLY public.xdata_student_queries
    ADD CONSTRAINT xdata_student_queries_pkey PRIMARY KEY (course_id, assignment_id, question_id, rollnum);


--
-- Name: xdata_users xdata_users_pkey; Type: CONSTRAINT; Schema: public; Owner: xdatauser
--

ALTER TABLE ONLY public.xdata_users
    ADD CONSTRAINT xdata_users_pkey PRIMARY KEY (internal_user_id);


--
-- Name: xdata_views xdata_views_pkey; Type: CONSTRAINT; Schema: public; Owner: xdatauser
--

ALTER TABLE ONLY public.xdata_views
    ADD CONSTRAINT xdata_views_pkey PRIMARY KEY (vname, rollnum);


--
-- PostgreSQL database dump complete
--

