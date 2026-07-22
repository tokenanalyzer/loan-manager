import 'package:shared_flutter/shared_flutter.dart';

import '../models/reward.dart';

class RewardRepository extends BaseRepository {
  RewardRepository(super.apiClient);

  Future<ApiResult<RewardConfig>> getConfig({String categoryId = 'personal'}) {
    return apiClient.request<RewardConfig>(
      (dio) => dio.get('/v1/rewards/config', queryParameters: {'categoryId': categoryId}),
      mapper: (data) => RewardConfig.fromJson(data as Map<String, dynamic>),
    );
  }

  Future<ApiResult<List<Reward>>> getMyRewards() {
    return get<List<Reward>>(
      '/v1/rewards/me',
      mapper: (data) =>
          (data as List<dynamic>).map((item) => Reward.fromJson(item as Map<String, dynamic>)).toList(),
    );
  }
}
