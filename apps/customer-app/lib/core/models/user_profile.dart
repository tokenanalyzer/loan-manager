/// Mirrors the backend's `UserProfileResponseDto` (from `GET /v1/auth/me`).
class UserProfile {
  const UserProfile({
    required this.id,
    required this.firebaseUid,
    required this.role,
    required this.isActive,
    this.email,
    this.fullName,
  });

  final String id;
  final String firebaseUid;
  final String? email;
  final String? fullName;
  final String role;
  final bool isActive;

  factory UserProfile.fromJson(Map<String, dynamic> json) {
    return UserProfile(
      id: json['id'] as String,
      firebaseUid: json['firebaseUid'] as String,
      email: json['email'] as String?,
      fullName: json['fullName'] as String?,
      role: json['role'] as String,
      isActive: json['isActive'] as bool,
    );
  }
}
