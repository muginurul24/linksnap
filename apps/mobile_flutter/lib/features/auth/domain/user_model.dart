class UserModel {
  const UserModel({
    required this.id,
    required this.name,
    required this.email,
    required this.plan,
    this.avatarUrl,
    this.emailVerified = false,
  });

  final String id;
  final String name;
  final String email;
  final String plan;
  final String? avatarUrl;
  final bool emailVerified;

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: (json['id'] ?? '').toString(),
      name: (json['name'] ?? 'LinkSnap User').toString(),
      email: (json['email'] ?? '').toString(),
      plan: (json['plan'] ?? json['subscriptionPlan'] ?? 'FREE').toString(),
      avatarUrl: json['avatarUrl'] as String?,
      emailVerified: json['emailVerified'] == true || json['emailVerifiedAt'] != null,
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'id': id,
      'name': name,
      'email': email,
      'plan': plan,
      'avatarUrl': avatarUrl,
      'emailVerified': emailVerified,
    };
  }

  UserModel copyWith({
    String? id,
    String? name,
    String? email,
    String? plan,
    String? avatarUrl,
    bool? emailVerified,
  }) {
    return UserModel(
      id: id ?? this.id,
      name: name ?? this.name,
      email: email ?? this.email,
      plan: plan ?? this.plan,
      avatarUrl: avatarUrl ?? this.avatarUrl,
      emailVerified: emailVerified ?? this.emailVerified,
    );
  }
}

class AuthSession {
  const AuthSession({
    required this.user,
    required this.token,
    required this.refreshToken,
  });

  final UserModel user;
  final String token;
  final String refreshToken;

  factory AuthSession.fromJson(Map<String, dynamic> json) {
    final userJson = (json['user'] as Map?)?.cast<String, dynamic>() ?? <String, dynamic>{};
    return AuthSession(
      user: UserModel.fromJson(userJson),
      token: (json['token'] ?? json['accessToken'] ?? '').toString(),
      refreshToken: (json['refreshToken'] ?? '').toString(),
    );
  }
}
