# Refactor Guide

## Tổng quan

Tài liệu này mô tả các cải tiến đã được thực hiện trong quá trình refactor codebase.

## Các cải tiến chính

### 1. Error Handling Thống nhất

**File:** `src/lib/error-handler.ts`

- Tất cả API responses giờ đều có format nhất quán: `{ success: boolean, data?, error?, code?, details? }`
- Xử lý các loại lỗi:
  - Zod validation errors
  - Prisma database errors (bao gồm P1001 connection errors)
  - Custom AppError
  - Generic errors

**Sử dụng:**
```typescript
import { asyncHandler, AppError } from '@/lib/error-handler';

export const GET = asyncHandler(async (req) => {
    // Your code here
    // Throw AppError for custom errors
    throw new AppError('Custom error', 400, 'CUSTOM_CODE');
});
```

### 2. Response Utilities

**File:** `server/utils/response.ts`

- `createSuccessResponse<T>(data, status)` - Tạo success response
- `createErrorResponse(message, status, code?, details?)` - Tạo error response
- `createPaginatedResponse<T>(data, page, limit, total)` - Tạo paginated response

**Sử dụng:**
```typescript
import { createSuccessResponse, createErrorResponse } from '@/server/utils/response';

// Success
return createSuccessResponse({ user: userData }, 200);

// Error
return createErrorResponse('User not found', 404, 'USER_NOT_FOUND');
```

### 3. Shared Types

**Files:**
- `src/types/api.ts` - API response types
- `src/types/database.ts` - Database types với relations

**Sử dụng:**
```typescript
import { ApiResponse, PaginatedResponse } from '@/types/api';
import { UserWithRelations } from '@/types/database';
```

### 4. Constants

**File:** `src/lib/constants.ts`

Tập trung hóa tất cả constants:
- API routes
- CEFR levels
- Activity types
- Score ranges
- Error messages
- Success messages

**Sử dụng:**
```typescript
import { API_ROUTES, CEFR_LEVELS, ERROR_MESSAGES } from '@/lib/constants';
```

### 5. Python Services Utilities

**Files:**
- `python-services/utils/logger.py` - Centralized logging
- `python-services/utils/errors.py` - Custom exceptions và error handling

**Sử dụng:**
```python
from utils.logger import setup_logger
from utils.errors import ServiceError, ValidationError, format_error_response

logger = setup_logger(__name__)

try:
    # Your code
except Exception as e:
    logger.error(f"Error: {e}")
    return jsonify(format_error_response(e)), 500
```

## Best Practices

### API Routes

1. **Luôn sử dụng asyncHandler:**
```typescript
import { asyncHandler } from '@/lib/error-handler';

export const GET = asyncHandler(async (req) => {
    // Your code
});
```

2. **Sử dụng response utilities:**
```typescript
import { createSuccessResponse } from '@/server/utils/response';

return createSuccessResponse(data);
```

3. **Type safety:**
```typescript
import { ApiResponse } from '@/types/api';

const response: ApiResponse<UserData> = await fetch(...);
```

### Error Handling

1. **Custom errors:**
```typescript
throw new AppError('Message', 400, 'ERROR_CODE', { details });
```

2. **Validation errors:**
```typescript
import { z } from 'zod';

const schema = z.object({ ... });
const result = schema.safeParse(data);
if (!result.success) {
    throw result.error; // Will be handled by asyncHandler
}
```

### Database Queries

1. **Sử dụng types:**
```typescript
import { UserWithRelations } from '@/types/database';

const user: UserWithRelations = await prisma.user.findUnique({...});
```

## Migration Guide

### Cập nhật API Routes cũ

**Trước:**
```typescript
export async function GET(req: Request) {
    try {
        const data = await getData();
        return NextResponse.json({ data });
    } catch (error) {
        return NextResponse.json({ error: 'Error' }, { status: 500 });
    }
}
```

**Sau:**
```typescript
import { asyncHandler } from '@/lib/error-handler';
import { createSuccessResponse } from '@/server/utils/response';

export const GET = asyncHandler(async (req) => {
    const data = await getData();
    return createSuccessResponse(data);
});
```

## Checklist Refactor

- [x] Error handling thống nhất
- [x] Response format nhất quán
- [x] Shared types
- [x] Constants tập trung
- [x] Python utilities
- [ ] Refactor tất cả API routes (đang tiến hành)
- [ ] Refactor services
- [ ] Refactor controllers
- [ ] Update tests

## Notes

- Tất cả thay đổi đều backward compatible
- Có thể migrate từng phần một
- Không breaking changes cho frontend

