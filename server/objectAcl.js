/**
 * Object Access Control (ACL) for SWF Platform
 * Secure ACL policies for KYC documents and file access control
 */

const ACL_POLICY_METADATA_KEY = 'custom:aclPolicy';

// The type of the access group for KYC documents
const ObjectAccessGroupType = {
  USER_OWNER: 'USER_OWNER',      // Document owner (the user who uploaded)
  ADMIN_ROLE: 'ADMIN_ROLE',      // Admin users
  KYC_REVIEWER: 'KYC_REVIEWER',  // KYC review team
};

const ObjectPermission = {
  READ: 'read',
  WRITE: 'write',
};

// Check if the requested permission is allowed based on the granted permission.
function isPermissionAllowed(requested, granted) {
  // Users granted with read or write permissions can read the object.
  if (requested === ObjectPermission.READ) {
    return [ObjectPermission.READ, ObjectPermission.WRITE].includes(granted);
  }

  // Only users granted with write permissions can write the object.
  return granted === ObjectPermission.WRITE;
}

// Base class for access groups
class BaseObjectAccessGroup {
  constructor(type, id) {
    this.type = type;
    this.id = id;
  }

  // Check if the user is a member of the group.
  async hasMember(userId, userRole) {
    switch (this.type) {
      case ObjectAccessGroupType.USER_OWNER:
        // User owns the document if their ID matches
        return userId && userId.toString() === this.id.toString();
        
      case ObjectAccessGroupType.ADMIN_ROLE:
        // Admin users have access
        return userRole && ['admin', 'super_admin'].includes(userRole);
        
      case ObjectAccessGroupType.KYC_REVIEWER:
        // KYC reviewers have access  
        return userRole && ['admin', 'super_admin', 'kyc_reviewer'].includes(userRole);
        
      default:
        return false;
    }
  }
}

function createObjectAccessGroup(group) {
  return new BaseObjectAccessGroup(group.type, group.id);
}

// Sets the ACL policy to the object metadata.
async function setObjectAclPolicy(objectFile, aclPolicy) {
  const [exists] = await objectFile.exists();
  if (!exists) {
    throw new Error(`Object not found: ${objectFile.name}`);
  }

  await objectFile.setMetadata({
    metadata: {
      [ACL_POLICY_METADATA_KEY]: JSON.stringify(aclPolicy),
    },
  });
}

// Gets the ACL policy from the object metadata.
async function getObjectAclPolicy(objectFile) {
  try {
    const [metadata] = await objectFile.getMetadata();
    const aclPolicy = metadata?.metadata?.[ACL_POLICY_METADATA_KEY];
    if (!aclPolicy) {
      return null;
    }
    return JSON.parse(aclPolicy);
  } catch (error) {
    console.error('Error getting ACL policy:', error);
    return null;
  }
}

// Checks if the user can access the object.
async function canAccessObject({
  userId,
  userRole,
  objectFile,
  requestedPermission,
}) {
  try {
    // When this function is called, the acl policy is required.
    const aclPolicy = await getObjectAclPolicy(objectFile);
    if (!aclPolicy) {
      // No ACL policy means no access by default for security
      return false;
    }

    // Public objects are always accessible for read.
    if (
      aclPolicy.visibility === 'public' &&
      requestedPermission === ObjectPermission.READ
    ) {
      return true;
    }

    // Access control requires the user id.
    if (!userId) {
      return false;
    }

    // The owner of the object can always access it.
    if (aclPolicy.owner && aclPolicy.owner.toString() === userId.toString()) {
      return true;
    }

    // Go through the ACL rules to check if the user has the required permission.
    for (const rule of aclPolicy.aclRules || []) {
      const accessGroup = createObjectAccessGroup(rule.group);
      if (
        (await accessGroup.hasMember(userId, userRole)) &&
        isPermissionAllowed(requestedPermission, rule.permission)
      ) {
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error('Error checking object access:', error);
    return false; // Deny access on error for security
  }
}

// Create default KYC document ACL policy
function createKYCDocumentAclPolicy(userId) {
  return {
    owner: userId.toString(),
    visibility: 'private', // KYC documents are always private
    aclRules: [
      // Document owner has read access
      {
        group: {
          type: ObjectAccessGroupType.USER_OWNER,
          id: userId.toString(),
        },
        permission: ObjectPermission.READ,
      },
      // Admin users have read access for KYC review
      {
        group: {
          type: ObjectAccessGroupType.ADMIN_ROLE,
          id: 'admin',
        },
        permission: ObjectPermission.READ,
      },
      // KYC reviewers have read access
      {
        group: {
          type: ObjectAccessGroupType.KYC_REVIEWER,
          id: 'kyc_reviewer',
        },
        permission: ObjectPermission.READ,
      },
    ],
  };
}

module.exports = {
  ObjectAccessGroupType,
  ObjectPermission,
  setObjectAclPolicy,
  getObjectAclPolicy,
  canAccessObject,
  createKYCDocumentAclPolicy,
};