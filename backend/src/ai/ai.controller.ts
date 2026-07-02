import { Body, Controller, Post, HttpCode } from '@nestjs/common';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsIn, IsString, MaxLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { AiService } from './ai.service';

class ChatMessageDto {
  @IsIn(['user', 'assistant'])
  role!: 'user' | 'assistant';

  @IsString()
  @MaxLength(2000)
  content!: string;
}

class ChatDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => ChatMessageDto)
  messages!: ChatMessageDto[];
}

@Controller('ai')
export class AiController {
  constructor(private ai: AiService) {}

  /** Public chat used by the landing-page assistant widget. */
  @Post('chat')
  @HttpCode(200)
  async chat(@Body() body: ChatDto) {
    const reply = await this.ai.chat(body.messages);
    return { reply };
  }
}
