module.exports = {

  caption: 'Impress CMS Database Schema',
  version: 5,

  CmsSkin: {
    caption: 'CMS Skins',
    fields: {
      SkinId:       { caption: 'Id',            type: 'id' },
      SkinName:     { caption: 'Skin Name',     type: 'str', size: 32, index: { unique: true } },
      CssVariables: { caption: 'CSS Variables', type: 'text', subtype: 'json' }
    }
  },

  CmsSite: {
    caption: 'CMS Sites',
    fields: {
      SiteId:       { caption: 'Id',            type: 'uid' },
      OwnerId:      { caption: 'Owner',         type: 'uid',              master: { dataset: 'SystemUser', key: 'UserId' } },
      SkinId:       { caption: 'Skin',          type: 'id',               link:   { dataset: 'CmsSkin' } },
      LanguageId:   { caption: 'Language',      type: 'id', default: '1', link:   { dataset: 'SystemLanguage' } },
      DomainName:   { caption: 'Domain Name',   type: 'str', size: 64,    index:  { unique: true } },
      Analytics:    { caption: 'Analytics',     type: 'str', size: 32 },
      CssBefore:    { caption: 'CSS Before',    type: 'text' },
      CssAfter:     { caption: 'CSS Afrer',     type: 'text' },
      CssVariables: { caption: 'CSS Variables', type: 'text' }
    }
  },

  CmsSiteProp: {
    caption: 'CMS Site Properties',
    fields: {
      SitePropId: { caption: 'Id',         type: 'id' },
      SiteId:     { caption: 'Site',       type: 'uid', master: { dataset: 'CmsSite' } },
      LanguageId: { caption: 'Language',   type: 'id',  link:   { dataset: 'SystemLanguage' } },
      Title:      { caption: 'Identifier', type: 'str', size: 255 },
      Subtitle:   { caption: 'Subtitle',   type: 'str', size: 255 },
      Copyright:  { caption: 'Copyright',  type: 'str', size: 255 }
    },
    indexes: {
      akCmsSiteProp: { fields: [ 'SiteId', 'LangiageId' ], unique: true }
    }
  },

  CmsSitePage: {
    caption: 'CMS Site Pages',
    fields: {
      PageId:       { caption: 'Id',       type: 'id' },
      ParentPageId: { caption: 'Parent',   type: 'tree' },
      SiteId:       { caption: 'Site',     type: 'uid', master: { dataset: 'CmsSite' } },
      Sequence:     { caption: 'Sequence', type: 'int', signed: false, nullable: false, default: '1' },
      PageType:     { caption: 'Type',     type: 'char', size: 1, default: 'P', lookup: { dictionary: {
        'P': 'Page', 'N': 'News', 'C': 'Catalog', 'A': 'Album'
      } } },
      Visible:      { caption: 'Visible',  type: 'char', size: 1, default: 'V', lookup: { dictionary: {
        'V': 'Visible', 'H': 'Hidden'
      } } },
      PubDate:      { caption: 'PubDate',  type: 'datetime', nullable: false, default: 'now', index: { unique: false } }
    }
  },

  CmsContent: {
    caption: 'CMS Content',
    fields: {
      ContentId:    { caption: 'Id',          type: 'id' },
      SiteId:       { caption: 'Site',        type: 'uid', master: { dataset: 'CmsSite' } },
      PageId:       { caption: 'Page',        type: 'id',  link:   { dataset: 'CmsSitePage' } },
      LanguageId:   { caption: 'Language',    type: 'id',  link:   { dataset: 'SystemLanguage' } },
      Priority:     { caption: 'Priority',    type: 'int', signed: false, nullable: false, default: '5' },
      PageName:     { caption: 'Name',        type: 'str', size: 128, nullable: false, index: { unique: false } },
      Caption:      { caption: 'Caption',     type: 'str', size: 128 },
      Subtitle:     { caption: 'Subtitle',    type: 'str', size: 128 },
      Title:        { caption: 'Title',       type: 'str', size: 255 },
      Description:  { caption: 'Description', type: 'str', size: 255 },
      Keywords:     { caption: 'Keywords',    type: 'str', size: 255 },
      Content:      { caption: 'Content',     type: 'text' }
    },
    indexes: {
      akCmsContentPage: { fields: [ 'PageId', 'LangiageId' ], unique: true },
      akCmsContentSite: { fields: [ 'SiteId', 'PageName', 'LangiageId' ], unique: true }
    }
  },

  CmsPost: {
    caption: 'CMS Posts',
    fields: {
      PostId:      { caption: 'Id',       type: 'id' },
      PageId:      { caption: 'Page',     type: 'id', link: { dataset: 'CmsSitePage' } },
      LanguageId:  { caption: 'Language', type: 'id', link: { dataset: 'SystemLanguage' } },
      ThreadId:    { caption: 'Thread',   type: 'tree' },
      PostDate:    { caption: 'Date',     type: 'datetime', nullable: false, default: 'now', index: { unique: false } },
      IpAddress:   { caption: 'IP',       type: 'ip',                                        index: { unique: false } },
      MessageHash: { caption: 'Hash',     type: 'hash',     nullable: false,                 index: { unique: true } },
      Flag:        { caption: 'Flag',     type: 'char', size: 1, default: 'V', lookup: { dictionary: {
        'V': 'Visible', 'B': 'Blocked', 'H': 'Hidden'
      } } },
      NicName:     { caption: 'Name',     type: 'str', size: 64, index: { unique: false } },
      Content:     { caption: 'Content',  type: 'text' }
    },
    indexes: {
      idxCmsPost: { fields: [ 'PageId', 'LangiageId' ], unique: false }
    }
  },

  CmsFile: {
    caption: 'CMS File',
    fields: {
      FileId:       { caption: 'Id',          type: 'id' },
      SiteId:       { caption: 'Site',        type: 'uid',                   link:  { dataset: 'CmsSite' } },
      Hash:         { caption: 'Hash',        type: 'hash', nullable: false, index: { unique: true } },
      StorageSize:  { caption: 'Storage',     type: 'int',  nullable: false },
      OriginalSize: { caption: 'Size',        type: 'int',  nullable: false },
      Downloads:    { caption: 'Downloads',   type: 'int',  nullable: false, default: '0' },
      UploadTime:   { caption: 'UploadTime',  type: 'datetime', nullable: false, default: 'now', index: { unique: false } },
      Flag:         { caption: 'Flag',        type: 'char', size: 1, default: 'U', nullable: false, index: { unique: false }, lookup: { dictionary: {
        'U': 'Uploaded', 'A': 'Available after antivirus check', 'B': 'Blocked', 'M': 'Marked for deletion', 'R': 'Removed', 'V': 'Virus'
      } } },
      Compression:  { caption: 'Compression', type: 'char', size: 1, default: 'N', nullable: false, index: { unique: false }, lookup: { dictionary: {
        'N': 'None', 'Z': 'ZIP', 'G': 'GZIP', 'I': 'Image'
      } } },
      Extension:    { caption: 'Extension',   type: 'str', size: 8,    nullable: false },
      OriginalName: { caption: 'Name',        type: 'str', size: 1024, nullable: false },
      IpAddress:    { caption: 'IP Address',  type: 'ip',              nullable: false, index: { unique: false } }
    }
  }

};
