-- -------------------------------------------------
-- Impress CMS Database Schema
-- Version: 5
-- -------------------------------------------------

CREATE TABLE CmsSkin (
  SkinId       bigint unsigned NOT NULL,
  SkinName     varchar(32),
  CssVariables text
);

ALTER TABLE CmsSkin ADD CONSTRAINT pkCmsSkin PRIMARY KEY (SkinId);
ALTER TABLE CmsSkin CHANGE SkinId SkinId bigint unsigned NOT NULL auto_increment;

CREATE UNIQUE INDEX akCmsSkinSkinName ON CmsSkin (SkinName);

CREATE TABLE CmsSite (
  SiteId       bigint unsigned,
  OwnerId      bigint unsigned NOT NULL,
  SkinId       bigint unsigned NOT NULL,
  LanguageId   bigint unsigned NOT NULL DEFAULT "1",
  DomainName   varchar(64),
  Analytics    varchar(32),
  CssBefore    text,
  CssAfter     text,
  CssVariables text
);

ALTER TABLE CmsSite ADD CONSTRAINT pkCmsSite PRIMARY KEY (SiteId);
ALTER TABLE CmsSite CHANGE SiteId SiteId bigint unsigned auto_increment;

CREATE UNIQUE INDEX akCmsSiteDomainName ON CmsSite (DomainName);

ALTER TABLE CmsSite ADD CONSTRAINT fkCmsSiteOwnerId FOREIGN KEY (OwnerId) REFERENCES SystemUser (UserId) ON DELETE CASCADE;
ALTER TABLE CmsSite ADD CONSTRAINT fkCmsSiteSkinId FOREIGN KEY (SkinId) REFERENCES CmsSkin (SkinId) ON DELETE RESTRICT;
ALTER TABLE CmsSite ADD CONSTRAINT fkCmsSiteLanguageId FOREIGN KEY (LanguageId) REFERENCES SystemLanguage (LanguageId) ON DELETE RESTRICT;

CREATE TABLE CmsSiteProp (
  SitePropId bigint unsigned NOT NULL,
  SiteId     bigint unsigned NOT NULL,
  LanguageId bigint unsigned NOT NULL,
  Title      varchar(255),
  Subtitle   varchar(255),
  Copyright  varchar(255)
);

ALTER TABLE CmsSiteProp ADD CONSTRAINT pkCmsSiteProp PRIMARY KEY (SitePropId);
ALTER TABLE CmsSiteProp CHANGE SitePropId SitePropId bigint unsigned NOT NULL auto_increment;

ALTER TABLE CmsSiteProp ADD CONSTRAINT fkCmsSitePropSiteId FOREIGN KEY (SiteId) REFERENCES CmsSite (SiteId) ON DELETE CASCADE;
ALTER TABLE CmsSiteProp ADD CONSTRAINT fkCmsSitePropLanguageId FOREIGN KEY (LanguageId) REFERENCES SystemLanguage (LanguageId) ON DELETE RESTRICT;

CREATE TABLE CmsSitePage (
  PageId       bigint unsigned NOT NULL,
  ParentPageId bigint unsigned,
  SiteId       bigint unsigned NOT NULL,
  Sequence     int(10) unsigned NOT NULL DEFAULT "1",
  PageType     char(1) DEFAULT "P",
  Visible      char(1) DEFAULT "V",
  PubDate      timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE CmsSitePage ADD CONSTRAINT pkCmsSitePage PRIMARY KEY (PageId);
ALTER TABLE CmsSitePage CHANGE PageId PageId bigint unsigned NOT NULL auto_increment;

CREATE INDEX idxCmsSitePagePubDate ON CmsSitePage (PubDate);

ALTER TABLE CmsSitePage ADD CONSTRAINT fkCmsSitePageSiteId FOREIGN KEY (SiteId) REFERENCES CmsSite (SiteId) ON DELETE CASCADE;

CREATE TABLE CmsContent (
  ContentId   bigint unsigned NOT NULL,
  SiteId      bigint unsigned NOT NULL,
  PageId      bigint unsigned NOT NULL,
  LanguageId  bigint unsigned NOT NULL,
  Priority    int(10) unsigned NOT NULL DEFAULT "5",
  PageName    varchar(128) NOT NULL,
  Caption     varchar(128),
  Subtitle    varchar(128),
  Title       varchar(255),
  Description varchar(255),
  Keywords    varchar(255),
  Content     text
);

ALTER TABLE CmsContent ADD CONSTRAINT pkCmsContent PRIMARY KEY (ContentId);
ALTER TABLE CmsContent CHANGE ContentId ContentId bigint unsigned NOT NULL auto_increment;

CREATE INDEX idxCmsContentPageName ON CmsContent (PageName);

ALTER TABLE CmsContent ADD CONSTRAINT fkCmsContentSiteId FOREIGN KEY (SiteId) REFERENCES CmsSite (SiteId) ON DELETE CASCADE;
ALTER TABLE CmsContent ADD CONSTRAINT fkCmsContentPageId FOREIGN KEY (PageId) REFERENCES CmsSitePage (PageId) ON DELETE RESTRICT;
ALTER TABLE CmsContent ADD CONSTRAINT fkCmsContentLanguageId FOREIGN KEY (LanguageId) REFERENCES SystemLanguage (LanguageId) ON DELETE RESTRICT;

CREATE TABLE CmsPost (
  PostId      bigint unsigned NOT NULL,
  PageId      bigint unsigned NOT NULL,
  LanguageId  bigint unsigned NOT NULL,
  ThreadId    bigint unsigned,
  PostDate    timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  IpAddress   int unsigned,
  MessageHash binary(32) NOT NULL,
  Flag        char(1) DEFAULT "V",
  NicName     varchar(64),
  Content     text
);

ALTER TABLE CmsPost ADD CONSTRAINT pkCmsPost PRIMARY KEY (PostId);
ALTER TABLE CmsPost CHANGE PostId PostId bigint unsigned NOT NULL auto_increment;

CREATE INDEX idxCmsPostPostDate ON CmsPost (PostDate);
CREATE INDEX idxCmsPostIpAddress ON CmsPost (IpAddress);
CREATE UNIQUE INDEX akCmsPostMessageHash ON CmsPost (MessageHash);
CREATE INDEX idxCmsPostNicName ON CmsPost (NicName);

ALTER TABLE CmsPost ADD CONSTRAINT fkCmsPostPageId FOREIGN KEY (PageId) REFERENCES CmsSitePage (PageId) ON DELETE RESTRICT;
ALTER TABLE CmsPost ADD CONSTRAINT fkCmsPostLanguageId FOREIGN KEY (LanguageId) REFERENCES SystemLanguage (LanguageId) ON DELETE RESTRICT;

CREATE TABLE CmsFile (
  FileId       bigint unsigned NOT NULL,
  SiteId       bigint unsigned,
  Hash         binary(32) NOT NULL,
  StorageSize  int(10) NOT NULL,
  OriginalSize int(10) NOT NULL,
  Downloads    int(10) NOT NULL DEFAULT "0",
  UploadTime   timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  Flag         char(1) NOT NULL DEFAULT "U",
  Compression  char(1) NOT NULL DEFAULT "N",
  Extension    varchar(8) NOT NULL,
  OriginalName varchar(1024) NOT NULL,
  IpAddress    int unsigned NOT NULL
);

ALTER TABLE CmsFile ADD CONSTRAINT pkCmsFile PRIMARY KEY (FileId);
ALTER TABLE CmsFile CHANGE FileId FileId bigint unsigned NOT NULL auto_increment;

CREATE UNIQUE INDEX akCmsFileHash ON CmsFile (Hash);
CREATE INDEX idxCmsFileUploadTime ON CmsFile (UploadTime);
CREATE INDEX idxCmsFileFlag ON CmsFile (Flag);
CREATE INDEX idxCmsFileCompression ON CmsFile (Compression);
CREATE INDEX idxCmsFileIpAddress ON CmsFile (IpAddress);

ALTER TABLE CmsFile ADD CONSTRAINT fkCmsFileSiteId FOREIGN KEY (SiteId) REFERENCES CmsSite (SiteId) ON DELETE SET NULL;

