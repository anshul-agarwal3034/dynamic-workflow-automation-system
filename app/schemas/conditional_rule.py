import uuid
from typing import Literal, Optional
from pydantic import BaseModel, ConfigDict, model_validator

OperatorType = Literal["equals", "not_equals", "contains", "greater_than", "is_empty"]
ActionType = Literal["show", "hide", "require", "show_and_require"]


class ConditionalRuleBase(BaseModel):
    trigger_field_id: uuid.UUID
    target_field_id: uuid.UUID
    operator: OperatorType
    comparison_value: Optional[str] = None
    action: ActionType

    @model_validator(mode="after")
    def check_trigger_target_differ(self):
        if self.trigger_field_id == self.target_field_id:
            raise ValueError("A field cannot target itself: trigger_field_id cannot equal target_field_id.")
        return self


class ConditionalRuleCreate(ConditionalRuleBase):
    pass


class ConditionalRuleUpdate(BaseModel):
    trigger_field_id: Optional[uuid.UUID] = None
    target_field_id: Optional[uuid.UUID] = None
    operator: Optional[OperatorType] = None
    comparison_value: Optional[str] = None
    action: Optional[ActionType] = None

    @model_validator(mode="after")
    def check_trigger_target_differ(self):
        if self.trigger_field_id is not None and self.target_field_id is not None:
            if self.trigger_field_id == self.target_field_id:
                raise ValueError("A field cannot target itself: trigger_field_id cannot equal target_field_id.")
        return self


class ConditionalRuleResponse(ConditionalRuleBase):
    id: uuid.UUID

    model_config = ConfigDict(from_attributes=True)
