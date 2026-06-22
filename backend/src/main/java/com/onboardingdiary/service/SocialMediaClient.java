package com.onboardingdiary.service;

import com.onboardingdiary.model.SocialPlatform;

public interface SocialMediaClient {

    String post(SocialPlatform platform, String accessToken, String message);
}
