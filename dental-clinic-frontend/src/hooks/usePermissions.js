/**
 * Role & Permission was removed from this build — every authenticated user has
 * full access to the modules that ship with the app. The hook is kept so pages
 * can carry on calling `usePermissions('Module Name')` unchanged.
 */
const FULL_ACCESS = {
  view: true,
  add: true,
  update: true,
  delete: true,
  import: true,
  editStatus: true,
  isSuperAdmin: true,
  loading: false
};

const usePermissions = () => FULL_ACCESS;

export default usePermissions;
