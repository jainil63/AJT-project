/**
 * Resolve display name from Branch / RegistrationBranch associations.
 */
export const getBranchName = (item, { preferRegistration = false } = {}) => {
  if (!item) return '—';
  if (preferRegistration) {
    return item.RegistrationBranch?.name || item.Branch?.name || item.Branch?.branchName || '—';
  }
  return item.Branch?.name || item.Branch?.branchName || item.RegistrationBranch?.name || '—';
};

export const getDoctorBranchesLabel = (doctor) => {
  const names = (doctor?.Branches || []).map((b) => b.name).filter(Boolean);
  return names.length ? names.join(', ') : '—';
};

export const getTaskBranchName = (task, branches = []) => {
  const fromAssoc = task?.AssignedUser?.Branch?.name;
  if (fromAssoc) return fromAssoc;
  const branchId = task?.AssignedUser?.branchId;
  if (branchId && branches.length) {
    return branches.find((b) => b.id === branchId)?.name || '—';
  }
  return '—';
};
