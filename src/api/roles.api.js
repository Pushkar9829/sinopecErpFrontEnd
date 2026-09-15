import { api } from './client';

export const rolesApi = {
  list: () => api.get('/api/roles'),
  updatePermissions: (id, permissionIds) =>
    api.patch(`/api/roles/${id}/permissions`, { permissionIds }),
};
