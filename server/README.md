# Server Directory Structure

Thư mục `server/` chứa tất cả business logic và data operations cho backend.

## Cấu trúc

```
server/
├── controllers/     # Business logic và request handling
├── services/        # Data operations và database queries
└── utils/           # Utility functions và helpers
```

## Controllers

Controllers chứa business logic và xử lý các yêu cầu từ API routes.

### `activityController.ts`
- `getActivities(skill, filters)`: Lấy danh sách activities theo skill
- `getActivityById(activityId, skill)`: Lấy chi tiết activity

### `userController.ts`
- `getProfile(userId)`: Lấy thông tin profile
- `updateProfile(userId, data, currentUser)`: Cập nhật profile
- `getStats(userId)`: Lấy thống kê user

### `authController.ts`
- `register(data)`: Đăng ký user mới

## Services

Services chứa data operations và database queries.

### `activityService.ts`
- `getActivitiesBySkill(skill, filters)`: Query activities từ database
- `getActivityByIdWithIncludes(activityId, skill)`: Query activity với appropriate includes
- `formatActivities(activities, skill)`: Format activities cho response
- `formatWritingPrompts(activity)`: Format writing prompts
- `formatReadingActivity(activity)`: Format reading activity
- `formatSpeakingActivity(activity)`: Format speaking activity
- `formatListeningActivity(activity)`: Format listening activity

### `userService.ts`
- `getUserById(userId)`: Lấy user by ID
- `getUserByEmail(email)`: Lấy user by email
- `updateUser(userId, data)`: Cập nhật user
- `isEmailTaken(email, excludeUserId)`: Check email đã tồn tại chưa
- `hashPassword(password)`: Hash password
- `comparePassword(password, hashedPassword)`: So sánh password
- `createUser(data)`: Tạo user mới
- `getUserStats(userId)`: Lấy thống kê user

## Utils

### `auth.ts`
- `getSession()`: Lấy session từ request
- `requireAuth()`: Check authentication, throw error nếu không authenticated
- `unauthorizedResponse()`: Tạo unauthorized response
- `createResponse(data, status)`: Tạo response

### `response.ts`
- `createResponse(data, status)`: Tạo response
- `createErrorResponse(message, status)`: Tạo error response
- `createSuccessResponse(data, status)`: Tạo success response

## Cách sử dụng

### Trong API Routes

```typescript
import { requireAuth, unauthorizedResponse, createResponse } from "@/server/utils/auth";
import { activityController } from "@/server/controllers/activityController";

export async function GET(req: NextRequest) {
  try {
    await requireAuth(); // Check authentication
    
    const result = await activityController.getActivities("WRITING", { level, type });
    
    return createResponse({ activities: result.data });
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return unauthorizedResponse();
    }
    
    return createResponse({ error: error.message }, 500);
  }
}
```

## Migration Status

### ✅ Đã di chuyển:
- `activityController` - Activities (reading, writing, speaking, listening)
- `userController` - User profile và stats
- `authController` - Registration
- `activityService` - Activity data operations
- `userService` - User data operations

### ⏳ Cần di chuyển:
- Writing routes (usage, complete, LLM features)
- Goals routes
- Notifications routes
- Analytics routes
- Progress routes
- Placement test routes
- Culture/Mediation routes
- Settings routes

## Best Practices

1. **Controllers**: Chỉ chứa business logic, không chứa database queries
2. **Services**: Chỉ chứa data operations, không chứa business logic
3. **Utils**: Chỉ chứa helper functions, không chứa business logic
4. **Error Handling**: Controllers throw errors, routes handle errors và return responses
5. **Authentication**: Sử dụng `requireAuth()` trong routes, không check trong controllers

## Naming Conventions

- **Files**: camelCase (e.g., `userController.ts`)
- **Classes**: PascalCase (e.g., `UserController`)
- **Functions**: camelCase (e.g., `getProfile`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MAX_RETRIES`)

