package models

// Role represents a named role (e.g., Admin, User) with optional description.
type Role struct {
	RoleID      int    `gorm:"column:role_id;primaryKey" json:"roleID"`
	RoleName    string `gorm:"column:role_name;unique;not null" json:"roleName"`
	Description string `gorm:"column:description" json:"description"`
}

func (Role) TableName() string { return "roles" }

// RolePermission maps a role to an allowed page string.
type RolePermission struct {
	RoleID int    `gorm:"column:role_id;primaryKey" json:"roleID"`
	Page   string `gorm:"column:page;primaryKey" json:"page"`
}

func (RolePermission) TableName() string { return "role_permissions" }

// UserHasRole maps a user to a role.
type UserHasRole struct {
	UserID int64 `gorm:"column:user_id;primaryKey" json:"userID"`
	RoleID int   `gorm:"column:role_id;primaryKey" json:"roleID"`
}

func (UserHasRole) TableName() string { return "user_has_role" }

// API contracts
type AddRoleRequest struct {
	Name        string   `json:"name" binding:"required,min=1"`
	Description string   `json:"description"`
	Permissions []string `json:"permissions"`
}

type UpdateRoleRequest struct {
	Name        *string   `json:"name,omitempty"`
	Description *string   `json:"description,omitempty"`
	Permissions *[]string `json:"permissions,omitempty"`
}

type RoleResponse struct {
	ID          int      `json:"id"`
	Name        string   `json:"name"`
	Description string   `json:"description"`
	Permissions []string `json:"permissions"`
	IsSystem    bool     `json:"isSystem"`
}
