-- -------------------------------------------------
-- Impress System Core Database Schema
-- Version: 9
-- -------------------------------------------------

CREATE TABLE SystemLanguage (
  LanguageId   bigint unsigned NOT NULL,
  LanguageName varchar(32) NOT NULL,
  Sign         char(2) NOT NULL,
  ISO          char(2) NOT NULL,
  Caption      varchar(32) NOT NULL
);

ALTER TABLE SystemLanguage ADD CONSTRAINT pkSystemLanguage PRIMARY KEY (LanguageId);
ALTER TABLE SystemLanguage CHANGE LanguageId LanguageId bigint unsigned NOT NULL auto_increment;

CREATE UNIQUE INDEX akSystemLanguageLanguageName ON SystemLanguage (LanguageName);
CREATE UNIQUE INDEX akSystemLanguageSign ON SystemLanguage (Sign);
CREATE UNIQUE INDEX akSystemLanguageISO ON SystemLanguage (ISO);
CREATE UNIQUE INDEX akSystemLanguageCaption ON SystemLanguage (Caption);

CREATE TABLE SystemServer (
  ServerId   bigint unsigned NOT NULL,
  ParentId   bigint unsigned,
  IpAddress  int unsigned NOT NULL,
  DomainName varchar(64) NOT NULL
);

ALTER TABLE SystemServer ADD CONSTRAINT pkSystemServer PRIMARY KEY (ServerId);
ALTER TABLE SystemServer CHANGE ServerId ServerId bigint unsigned NOT NULL auto_increment;

CREATE UNIQUE INDEX akSystemServerIpAddress ON SystemServer (IpAddress);
CREATE UNIQUE INDEX akSystemServerDomainName ON SystemServer (DomainName);

CREATE TABLE SystemUnique (
  UniqueId     bigint unsigned NOT NULL,
  ParentId     bigint unsigned,
  ServerId     bigint unsigned NOT NULL,
  Identifier   varchar(64),
  Status       char(1),
  CreationDate timestamp NOT NULL
);

ALTER TABLE SystemUnique ADD CONSTRAINT pkSystemUnique PRIMARY KEY (UniqueId);
ALTER TABLE SystemUnique CHANGE UniqueId UniqueId bigint unsigned NOT NULL auto_increment;

CREATE UNIQUE INDEX akSystemUniqueIdentifier ON SystemUnique (Identifier);
CREATE INDEX idxSystemUniqueCreationDate ON SystemUnique (CreationDate);

ALTER TABLE SystemUnique ADD CONSTRAINT fkSystemUniqueServerId FOREIGN KEY (ServerId) REFERENCES SystemServer (ServerId) ON DELETE RESTRICT;

CREATE TABLE SystemUser (
  UserId   bigint unsigned,
  Login    varchar(64) NOT NULL,
  Password varchar(64) NOT NULL,
  FullName varchar(255)
);

ALTER TABLE SystemUser ADD CONSTRAINT pkSystemUser PRIMARY KEY (UserId);
ALTER TABLE SystemUser CHANGE UserId UserId bigint unsigned auto_increment;

CREATE UNIQUE INDEX akSystemUserLogin ON SystemUser (Login);

CREATE TABLE SystemGroup (
  GroupId   bigint unsigned,
  GroupName varchar(64) NOT NULL
);

ALTER TABLE SystemGroup ADD CONSTRAINT pkSystemGroup PRIMARY KEY (GroupId);
ALTER TABLE SystemGroup CHANGE GroupId GroupId bigint unsigned auto_increment;

CREATE UNIQUE INDEX akSystemGroupGroupName ON SystemGroup (GroupName);

CREATE TABLE SystemGroupUser (
  GroupId bigint unsigned NOT NULL,
  UserId  bigint unsigned NOT NULL
);

ALTER TABLE SystemGroupUser ADD CONSTRAINT pkSystemGroupUser PRIMARY KEY (GroupId, UserId);
ALTER TABLE SystemGroupUser ADD CONSTRAINT fkSystemGroupUserGroupId FOREIGN KEY (GroupId) REFERENCES SystemGroup (GroupId) ON DELETE CASCADE;
ALTER TABLE SystemGroupUser ADD CONSTRAINT fkSystemGroupUserUserId FOREIGN KEY (UserId) REFERENCES SystemUser (UserId) ON DELETE CASCADE;

CREATE TABLE SystemPermission (
  PermissionId   bigint unsigned,
  ParentId       bigint unsigned,
  PermissionName varchar(64) NOT NULL
);

ALTER TABLE SystemPermission ADD CONSTRAINT pkSystemPermission PRIMARY KEY (PermissionId);
ALTER TABLE SystemPermission CHANGE PermissionId PermissionId bigint unsigned auto_increment;

CREATE UNIQUE INDEX akSystemPermissionPermissionName ON SystemPermission (PermissionName);

CREATE TABLE SystemGroupPermission (
  GroupId      bigint unsigned NOT NULL,
  PermissionId bigint unsigned NOT NULL
);

ALTER TABLE SystemGroupPermission ADD CONSTRAINT pkSystemGroupPermission PRIMARY KEY (GroupId, PermissionId);
ALTER TABLE SystemGroupPermission ADD CONSTRAINT fkSystemGroupPermissionGroupId FOREIGN KEY (GroupId) REFERENCES SystemGroup (GroupId) ON DELETE CASCADE;
ALTER TABLE SystemGroupPermission ADD CONSTRAINT fkSystemGroupPermissionPermissionId FOREIGN KEY (PermissionId) REFERENCES SystemPermission (PermissionId) ON DELETE CASCADE;

CREATE TABLE SystemUserPermission (
  UserId       bigint unsigned NOT NULL,
  PermissionId bigint unsigned NOT NULL
);

ALTER TABLE SystemUserPermission ADD CONSTRAINT pkSystemUserPermission PRIMARY KEY (UserId, PermissionId);
ALTER TABLE SystemUserPermission ADD CONSTRAINT fkSystemUserPermissionUserId FOREIGN KEY (UserId) REFERENCES SystemUser (UserId) ON DELETE CASCADE;
ALTER TABLE SystemUserPermission ADD CONSTRAINT fkSystemUserPermissionPermissionId FOREIGN KEY (PermissionId) REFERENCES SystemPermission (PermissionId) ON DELETE CASCADE;

CREATE TABLE SystemLog (
  LogId     bigint unsigned NOT NULL,
  ServerId  bigint unsigned NOT NULL,
  EventTime timestamp NOT NULL,
  Status    char(1),
  EventType varchar(32),
  Message   varchar(128),
  EventData text
);

ALTER TABLE SystemLog ADD CONSTRAINT pkSystemLog PRIMARY KEY (LogId);
ALTER TABLE SystemLog CHANGE LogId LogId bigint unsigned NOT NULL auto_increment;

CREATE INDEX idxSystemLogEventTime ON SystemLog (EventTime);
CREATE INDEX idxSystemLogEventType ON SystemLog (EventType);

ALTER TABLE SystemLog ADD CONSTRAINT fkSystemLogServerId FOREIGN KEY (ServerId) REFERENCES SystemServer (ServerId) ON DELETE CASCADE;

