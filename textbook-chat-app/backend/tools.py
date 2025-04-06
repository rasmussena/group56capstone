import json
from langchain_core.messages import ToolMessage
from langchain_community.tools import tool
#from retrievertool import generate_retriever_tool
from langchain_openai import ChatOpenAI
from langgraph.prebuilt import create_react_agent
from langchain.tools.retriever import create_retriever_tool
import ast
import re


class BasicToolNode:
    """
    A node that processes and executes tool requests embedded in the last AI message.
    """

    def __init__(self, tools: list) -> None:
        # Create a dictionary of tools for easy access by their names.
        self.tools_by_name = {tool.name: tool for tool in tools}

    def __call__(self, inputs: dict):
        """
        Process tool calls from the last AI message and execute them.
        """
        if messages := inputs.get("messages", []):
            message = messages[-1]
        else:
            raise ValueError("No messages found in input.")

        outputs = []

        for tool_call in message.tool_calls:
            tool_result = self.tools_by_name[tool_call["name"]].invoke(
                tool_call["args"]
            )
            outputs.append(
                ToolMessage(
                    content=json.dumps(tool_result),
                    name=tool_call["name"],
                    tool_call_id=tool_call["id"],
                )
            )
        return {"messages": outputs}
    
# ==========================================================================================
# Easily modify this list of tools to add or remove tools from the single agent.
# We can also add new agents with their own tools, as long as we route them properly in the workflow.
# Look at the example below to see how a tool is defined.

# [TEST]
# def sum(x,y):
#     z = x+y 
#     print("wtf")
#     return z
# @tool
# def add(a: int, b: int) -> int:
#     """Use this tool to add two numbers."""
#     return sum(a,b)
# ==========================================================================================

    
def get_tools(retriever):
    """
    Returns a list of tools for the chatbot.
    """    
    #textbook_retriever = generate_retriever_tool()
    textbook_retriever_tool = create_retriever_tool(
        retriever,
        "retrieve_textbook_content",
        "Search and return information from the textbook.")
    
    tools = [textbook_retriever_tool]#[textbook_retriever] 
    return tools