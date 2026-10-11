-- ParkSense baseline schema (MySQL 8). Generated from the JPA entities with Hibernate's
-- schema export and kept in sync by hand from here on: every entity change needs a new V<n>__*.sql.
-- Enum columns are MySQL ENUMs - adding a Java enum constant requires an ALTER in a new migration.


create table monitoring_devices (
    active bit not null,
    created_at datetime(6) not null,
    id bigint not null auto_increment,
    last_seen_at datetime(6),
    updated_at datetime(6) not null,
    zone_id bigint not null,
    code varchar(50) not null,
    identifier varchar(120),
    name varchar(150) not null,
    stream_url varchar(500),
    status enum ('ONLINE','OFFLINE','MAINTENANCE') not null,
    type enum ('CAMERA','SENSOR','MANUAL') not null,
    primary key (id)
) engine=InnoDB;

create table occupancy_events (
    confidence float(53),
    actor_user_id bigint,
    created_at datetime(6) not null,
    device_id bigint,
    id bigint not null auto_increment,
    occurred_at datetime(6) not null,
    space_id bigint not null,
    updated_at datetime(6) not null,
    external_id varchar(120),
    note varchar(255),
    source enum ('CAMERA','SENSOR','MANUAL','QR','PHOTO') not null,
    state enum ('OCCUPIED','VACANT','UNKNOWN') not null,
    primary key (id)
) engine=InnoDB;

create table organizations (
    active bit not null,
    created_at datetime(6) not null,
    id bigint not null auto_increment,
    updated_at datetime(6) not null,
    contact_phone varchar(30),
    code varchar(50) not null,
    contact_email varchar(150),
    name varchar(150) not null,
    address varchar(255),
    primary key (id)
) engine=InnoDB;

create table parking_sessions (
    amount decimal(10,2),
    check_in_at datetime(6) not null,
    check_out_at datetime(6),
    created_at datetime(6) not null,
    duration_minutes bigint,
    id bigint not null auto_increment,
    paid_at datetime(6),
    reservation_id bigint,
    space_id bigint not null,
    updated_at datetime(6) not null,
    user_id bigint,
    vehicle_id bigint,
    code varchar(40) not null,
    payment_ref varchar(40),
    note varchar(255),
    payment_method enum ('UPI','CARD','CASH','WALLET'),
    payment_status enum ('NOT_REQUIRED','PENDING','PAID'),
    source enum ('CAMERA','SENSOR','MANUAL','QR','PHOTO') not null,
    status enum ('ACTIVE','COMPLETED') not null,
    primary key (id)
) engine=InnoDB;

create table parking_sites (
    active bit not null,
    hourly_rate decimal(8,2),
    latitude float(53),
    longitude float(53),
    created_at datetime(6) not null,
    id bigint not null auto_increment,
    organization_id bigint not null,
    updated_at datetime(6) not null,
    code varchar(50) not null,
    opening_hours varchar(60),
    city varchar(100),
    name varchar(150) not null,
    description varchar(500),
    address varchar(255),
    amenities varchar(255),
    cover_image_url varchar(255),
    category enum ('CAFE','RESTAURANT','MALL','OFFICE','HOTEL','HOSPITAL','EVENT_VENUE','OTHER'),
    primary key (id)
) engine=InnoDB;

create table parking_spaces (
    active bit not null,
    positionx float(53),
    positiony float(53),
    reserved bit not null,
    created_at datetime(6) not null,
    id bigint not null auto_increment,
    updated_at datetime(6) not null,
    zone_id bigint not null,
    code varchar(50),
    label varchar(255),
    occupancy_state enum ('OCCUPIED','VACANT','UNKNOWN') not null,
    operational_state enum ('IN_SERVICE','OUT_OF_SERVICE','MAINTENANCE') not null,
    polygon TEXT,
    verification_status enum ('PROPOSED','VERIFIED','REJECTED') not null,
    primary key (id)
) engine=InnoDB;

create table parking_zones (
    active bit not null,
    capacity integer,
    created_at datetime(6) not null,
    id bigint not null auto_increment,
    site_id bigint not null,
    updated_at datetime(6) not null,
    code varchar(50) not null,
    floor varchar(50),
    name varchar(150) not null,
    map_image_url varchar(500),
    description TEXT,
    type enum ('STRUCTURED','UNSTRUCTURED') not null,
    primary key (id)
) engine=InnoDB;

create table reservations (
    estimated_amount decimal(10,2),
    assigned_space_id bigint,
    created_at datetime(6) not null,
    end_time datetime(6) not null,
    id bigint not null auto_increment,
    start_time datetime(6) not null,
    updated_at datetime(6) not null,
    user_id bigint not null,
    vehicle_id bigint not null,
    zone_id bigint not null,
    code varchar(40) not null,
    status enum ('PENDING','CONFIRMED','ACTIVE','COMPLETED','CANCELLED','EXPIRED') not null,
    primary key (id)
) engine=InnoDB;

create table site_surveys (
    imported bit not null,
    imported_space_count integer,
    created_at datetime(6) not null,
    id bigint not null auto_increment,
    imported_at datetime(6),
    site_id bigint not null,
    updated_at datetime(6) not null,
    profile varchar(20),
    status varchar(30) not null,
    survey_job_id varchar(80) not null,
    layout_json MEDIUMTEXT,
    report_json MEDIUMTEXT,
    primary key (id)
) engine=InnoDB;

create table users (
    enabled bit not null,
    created_at datetime(6) not null,
    id bigint not null auto_increment,
    organization_id bigint,
    updated_at datetime(6) not null,
    phone varchar(30),
    full_name varchar(120) not null,
    email varchar(180) not null,
    password_hash varchar(255) not null,
    role enum ('ADMIN','MANAGER','USER') not null,
    primary key (id)
) engine=InnoDB;

create table vehicles (
    active bit not null,
    created_at datetime(6) not null,
    id bigint not null auto_increment,
    owner_id bigint not null,
    updated_at datetime(6) not null,
    color varchar(30),
    plate_number varchar(30) not null,
    make varchar(60),
    model varchar(60),
    type enum ('CAR','BIKE','SUV','TRUCK','EV','OTHER') not null,
    primary key (id)
) engine=InnoDB;

create index idx_device_zone 
   on monitoring_devices (zone_id);

alter table monitoring_devices 
   add constraint uk_device_zone_code unique (zone_id, code);

create index idx_event_space_time 
   on occupancy_events (space_id, occurred_at);

create index idx_event_occurred 
   on occupancy_events (occurred_at);

create index idx_event_source 
   on occupancy_events (source);

alter table occupancy_events 
   add constraint uk_event_source_external unique (source, external_id);

alter table organizations 
   add constraint uk_org_code unique (code);

create index idx_session_space 
   on parking_sessions (space_id);

create index idx_session_status 
   on parking_sessions (status);

create index idx_session_checkin 
   on parking_sessions (check_in_at);

alter table parking_sessions 
   add constraint uk_session_code unique (code);

create index idx_site_org 
   on parking_sites (organization_id);

create index idx_site_geo 
   on parking_sites (latitude, longitude);

create index idx_site_category 
   on parking_sites (category);

alter table parking_sites 
   add constraint uk_site_org_code unique (organization_id, code);

create index idx_space_zone 
   on parking_spaces (zone_id);

create index idx_space_occupancy 
   on parking_spaces (occupancy_state);

create index idx_space_operational 
   on parking_spaces (operational_state);

alter table parking_spaces 
   add constraint uk_space_zone_code unique (zone_id, code);

create index idx_zone_site 
   on parking_zones (site_id);

alter table parking_zones 
   add constraint uk_zone_site_code unique (site_id, code);

create index idx_reservation_user 
   on reservations (user_id);

create index idx_reservation_zone 
   on reservations (zone_id);

create index idx_reservation_status 
   on reservations (status);

alter table reservations 
   add constraint uk_reservation_code unique (code);

create index idx_survey_site 
   on site_surveys (site_id);

create index idx_survey_job 
   on site_surveys (survey_job_id);

create index idx_user_org 
   on users (organization_id);

alter table users 
   add constraint uk_user_email unique (email);

create index idx_vehicle_owner 
   on vehicles (owner_id);

create index idx_vehicle_plate 
   on vehicles (plate_number);

alter table monitoring_devices 
   add constraint FK4xvcrb8breddv2dx5kwvpnx1f 
   foreign key (zone_id) 
   references parking_zones (id);

alter table occupancy_events 
   add constraint FKq0sjhej9cds9xi7el3hq52ika 
   foreign key (actor_user_id) 
   references users (id);

alter table occupancy_events 
   add constraint FKdt7jjnorouhfut1aq7y3xvox7 
   foreign key (device_id) 
   references monitoring_devices (id);

alter table occupancy_events 
   add constraint FKm3jcd2149xavi3b0tacagciw 
   foreign key (space_id) 
   references parking_spaces (id);

alter table parking_sessions 
   add constraint FKp9ssgejordr55ko4o9sm34miu 
   foreign key (reservation_id) 
   references reservations (id);

alter table parking_sessions 
   add constraint FKbpr9ww3gm9f1inel4xrtxnyc0 
   foreign key (space_id) 
   references parking_spaces (id);

alter table parking_sessions 
   add constraint FKhi2pnajgdqtw20klb0ofq31j8 
   foreign key (user_id) 
   references users (id);

alter table parking_sessions 
   add constraint FKjpktyrfd2m3103vgike7xjao1 
   foreign key (vehicle_id) 
   references vehicles (id);

alter table parking_sites 
   add constraint FK1jhxt3g4oy8qjnp61spelgm4v 
   foreign key (organization_id) 
   references organizations (id);

alter table parking_spaces 
   add constraint FKlmctgi7jsty49qemjwmbkj4rx 
   foreign key (zone_id) 
   references parking_zones (id);

alter table parking_zones 
   add constraint FKeukrmt98gcgoy0ttctfixck5a 
   foreign key (site_id) 
   references parking_sites (id);

alter table reservations 
   add constraint FK5c1ah8d1a23hmthfp9c9knxmn 
   foreign key (assigned_space_id) 
   references parking_spaces (id);

alter table reservations 
   add constraint FKb5g9io5h54iwl2inkno50ppln 
   foreign key (user_id) 
   references users (id);

alter table reservations 
   add constraint FK7s1rlt0ccv2hjeaubf52di8er 
   foreign key (vehicle_id) 
   references vehicles (id);

alter table reservations 
   add constraint FKcy0h8yue5xb1vqet869yqyv2f 
   foreign key (zone_id) 
   references parking_zones (id);

alter table site_surveys 
   add constraint FKk4epkei0v57d0iyrlata00rw7 
   foreign key (site_id) 
   references parking_sites (id);

alter table users 
   add constraint FKqpugllwvyv37klq7ft9m8aqxk 
   foreign key (organization_id) 
   references organizations (id);

alter table vehicles 
   add constraint FKi251m7sfpn4k64pif7wk70jlu 
   foreign key (owner_id) 
   references users (id);
