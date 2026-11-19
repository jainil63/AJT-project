/**
 * Role & Permission was removed from this build. The sidebar renders every
 * module, so this hook resolves immediately with full access.
 */
const ALL_ACCESS = { isSuperAdmin: true, modules: {}, loading: false };

export const resetAllPermissionsCache = () => {};

const useAllPermissions = () => ALL_ACCESS;

export default useAllPermissions;
